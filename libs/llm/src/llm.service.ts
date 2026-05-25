import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { PrismaService } from '@nih/database';
import type { Env } from '@nih/config';

import {
  type LlmService,
  type LlmProviderAdapter,
  type ArticleAnalysisInput,
  type ArticleAnalysisResult,
  type EntityMatchInput,
  type EntityMatchResult,
  type DigestInput,
  type DigestResult,
  LlmUnavailableError,
  LlmValidationError,
} from './llm.interface';
import { GoogleAdapter } from './adapters/google.adapter';
import { GroqAdapter } from './adapters/groq.adapter';

@Injectable()
export class LlmServiceImpl implements LlmService, OnModuleInit {
  private readonly logger = new Logger(LlmServiceImpl.name);
  private primaryAdapter!: LlmProviderAdapter;
  private fallbackAdapter!: LlmProviderAdapter;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.primaryAdapter = this.createAdapter(this.config.get('LLM_PRIMARY_PROVIDER'));
    this.fallbackAdapter = this.createAdapter(this.config.get('LLM_FALLBACK_PROVIDER'));
    this.logger.log(
      `LLM: primary=${this.primaryAdapter.name}, fallback=${this.fallbackAdapter.name}`,
    );
  }

  private createAdapter(provider: string): LlmProviderAdapter {
    if (provider === 'google') {
      const apiKey = this.config.get('LLM_API_KEY_GOOGLE');
      if (!apiKey) throw new Error('LLM_API_KEY_GOOGLE is required when provider=google');
      return new GoogleAdapter(apiKey, this.config.get('LLM_MODEL_GOOGLE'));
    }
    if (provider === 'groq') {
      const apiKey = this.config.get('LLM_API_KEY_GROQ');
      if (!apiKey) throw new Error('LLM_API_KEY_GROQ is required when provider=groq');
      return new GroqAdapter(apiKey, this.config.get('LLM_MODEL_GROQ'));
    }
    throw new Error(`Unknown LLM provider: ${provider}`);
  }

  // ─── Cache helpers ──────────────────────────────────────────────────────────

  private makeCacheKey(
    contentHash: string,
    operation: string,
    model: string,
    promptVersion: string,
  ): string {
    return crypto
      .createHash('sha256')
      .update(`${contentHash}:${operation}:${model}:${promptVersion}`)
      .digest('hex');
  }

  private async getCache<T>(cacheKey: string): Promise<T | null> {
    const entry = await this.prisma.llmCache.findUnique({ where: { cacheKey } });
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < new Date()) return null;

    await this.prisma.llmCache.update({
      where: { cacheKey },
      data: { hitCount: { increment: 1 }, lastHitAt: new Date() },
    });
    return entry.result as T;
  }

  private async setCache<T>(
    cacheKey: string,
    operation: string,
    contentHash: string,
    result: T,
    tokensInput?: number,
    tokensOutput?: number,
  ): Promise<void> {
    const model = this.config.get('LLM_MODEL_GOOGLE');
    const promptVersion = this.config.get('LLM_PROMPT_VERSION');
    await this.prisma.llmCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        operation,
        model,
        promptVersion,
        contentHash,
        result: result as object,
        tokensInput,
        tokensOutput,
      },
      update: {},
    });
  }

  // ─── Telemetry ──────────────────────────────────────────────────────────────

  private async recordTelemetry(opts: {
    userId?: string;
    operation: string;
    provider: string;
    model: string;
    tokensInput?: number;
    tokensOutput?: number;
    latencyMs?: number;
    cacheHit: boolean;
    success: boolean;
    errorCode?: string;
    articleId?: string;
  }): Promise<void> {
    await this.prisma.llmTelemetry.create({
      data: {
        userId: opts.userId,
        operation: opts.operation,
        provider: opts.provider,
        model: opts.model,
        tokensInput: opts.tokensInput ?? 0,
        tokensOutput: opts.tokensOutput ?? 0,
        latencyMs: opts.latencyMs,
        cacheHit: opts.cacheHit,
        success: opts.success,
        errorCode: opts.errorCode,
        articleId: opts.articleId,
      },
    });
  }

  // ─── Call with failover ──────────────────────────────────────────────────────

  private async callWithFailover<T>(
    operation: (adapter: LlmProviderAdapter) => Promise<T>,
    operationName: string,
  ): Promise<{ result: T; provider: string }> {
    const startMs = Date.now();

    // Try primary
    try {
      const result = await operation(this.primaryAdapter);
      return { result, provider: this.primaryAdapter.name };
    } catch (primaryErr) {
      this.logger.warn({
        event: 'llm_primary_failed',
        provider: this.primaryAdapter.name,
        operation: operationName,
        error: primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
      });

      // Failover to secondary
      try {
        const result = await operation(this.fallbackAdapter);
        this.logger.log({
          event: 'llm_failover_success',
          provider: this.fallbackAdapter.name,
          latencyMs: Date.now() - startMs,
        });
        return { result, provider: this.fallbackAdapter.name };
      } catch (fallbackErr) {
        this.logger.error({
          event: 'llm_both_providers_failed',
          operation: operationName,
          primaryError: primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
          fallbackError: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
        });
        throw new LlmUnavailableError();
      }
    }
  }

  // ─── Public interface ────────────────────────────────────────────────────────

  async analyzeArticle(input: ArticleAnalysisInput): Promise<ArticleAnalysisResult> {
    const model = this.config.get('LLM_MODEL_GOOGLE');
    const promptVersion = this.config.get('LLM_PROMPT_VERSION');
    const cacheKey = this.makeCacheKey(input.contentHash, 'analyze', model, promptVersion);

    const cached = await this.getCache<ArticleAnalysisResult>(cacheKey);
    if (cached) {
      await this.recordTelemetry({
        operation: 'analyze',
        provider: 'cache',
        model,
        cacheHit: true,
        success: true,
      });
      return cached;
    }

    const startMs = Date.now();
    let result: ArticleAnalysisResult;
    let provider: string;

    try {
      ({ result, provider } = await this.callWithFailover(
        (adapter) => adapter.analyzeArticle(input),
        'analyzeArticle',
      ));
    } catch (err) {
      await this.recordTelemetry({
        operation: 'analyze',
        provider: 'unknown',
        model,
        cacheHit: false,
        success: false,
        errorCode: err instanceof Error ? err.name : 'unknown',
      });
      throw err;
    }

    await this.setCache(cacheKey, 'analyze', input.contentHash, result);
    await this.recordTelemetry({
      operation: 'analyze',
      provider,
      model,
      latencyMs: Date.now() - startMs,
      cacheHit: false,
      success: true,
    });

    return result;
  }

  async matchEntities(input: EntityMatchInput): Promise<EntityMatchResult> {
    const model = this.config.get('LLM_MODEL_GOOGLE');
    const candidateHash = crypto
      .createHash('sha256')
      .update(`${input.candidate}:${input.options.join(',')}`)
      .digest('hex');
    const cacheKey = this.makeCacheKey(candidateHash, 'match_entities', model, 'v1');

    const cached = await this.getCache<EntityMatchResult>(cacheKey);
    if (cached) return cached;

    const { result, provider } = await this.callWithFailover(
      (adapter) => adapter.matchEntities(input),
      'matchEntities',
    );

    await this.setCache(cacheKey, 'match_entities', candidateHash, result);
    await this.recordTelemetry({
      operation: 'match_entities',
      provider,
      model,
      cacheHit: false,
      success: true,
    });

    return result;
  }

  async buildDigest(input: DigestInput): Promise<DigestResult> {
    const model = this.config.get('LLM_MODEL_GOOGLE');
    const startMs = Date.now();

    const { result, provider } = await this.callWithFailover(
      (adapter) => adapter.buildDigest(input),
      'buildDigest',
    );

    await this.recordTelemetry({
      operation: 'digest',
      provider,
      model,
      latencyMs: Date.now() - startMs,
      cacheHit: false,
      success: true,
    });

    return result;
  }
}
