import { createGroq } from '@ai-sdk/groq';
import { generateObject } from 'ai';

import {
  type LlmProviderAdapter,
  type ArticleAnalysisInput,
  type ArticleAnalysisResult,
  type EntityMatchInput,
  type EntityMatchResult,
  type DigestInput,
  type DigestResult,
  ArticleAnalysisResultSchema,
  BatchAnalysisResultSchema,
  EntityMatchResultSchema,
  DigestResultSchema,
  LlmValidationError,
} from '../llm.interface';
import {
  buildAnalysisPrompt,
  buildBatchAnalysisPrompt,
  buildEntityMatchPrompt,
  buildDigestPrompt,
} from '../prompt-builder';

export class GroqAdapter implements LlmProviderAdapter {
  readonly name = 'groq';

  private readonly model;

  constructor(apiKey: string, modelName: string) {
    const groq = createGroq({ apiKey });
    this.model = groq(modelName);
  }

  async analyzeArticle(input: ArticleAnalysisInput): Promise<ArticleAnalysisResult> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: ArticleAnalysisResultSchema,
        prompt: buildAnalysisPrompt(input),
        temperature: 0.1,
        mode: 'json',
      });
      return object;
    } catch (err) {
      throw new LlmValidationError(
        `Groq adapter analyzeArticle failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async analyzeArticleBatch(inputs: ArticleAnalysisInput[]): Promise<ArticleAnalysisResult[]> {
    if (inputs.length === 1) return [await this.analyzeArticle(inputs[0]!)];
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: BatchAnalysisResultSchema,
        prompt: buildBatchAnalysisPrompt(inputs),
        temperature: 0.1,
        mode: 'json',
      });
      if (object.results.length !== inputs.length) {
        throw new LlmValidationError(
          `Batch result count mismatch: expected ${inputs.length}, got ${object.results.length}`,
        );
      }
      return object.results;
    } catch (err) {
      throw new LlmValidationError(
        `Groq adapter analyzeArticleBatch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async matchEntities(input: EntityMatchInput): Promise<EntityMatchResult> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: EntityMatchResultSchema,
        prompt: buildEntityMatchPrompt(input),
        temperature: 0,
        mode: 'json',
      });
      return object;
    } catch (err) {
      throw new LlmValidationError(
        `Groq adapter matchEntities failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async buildDigest(input: DigestInput): Promise<DigestResult> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: DigestResultSchema,
        prompt: buildDigestPrompt(input),
        temperature: 0.3,
        mode: 'json',
      });
      return object;
    } catch (err) {
      throw new LlmValidationError(
        `Groq adapter buildDigest failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
