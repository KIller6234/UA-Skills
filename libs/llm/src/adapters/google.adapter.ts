import { createGoogleGenerativeAI } from '@ai-sdk/google';
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
  EntityMatchResultSchema,
  DigestResultSchema,
  LlmValidationError,
} from '../llm.interface';
import {
  buildAnalysisPrompt,
  buildEntityMatchPrompt,
  buildDigestPrompt,
} from '../prompt-builder';

export class GoogleAdapter implements LlmProviderAdapter {
  readonly name = 'google';

  private readonly model;

  constructor(apiKey: string, modelName: string) {
    const google = createGoogleGenerativeAI({ apiKey });
    this.model = google(modelName);
  }

  async analyzeArticle(input: ArticleAnalysisInput): Promise<ArticleAnalysisResult> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: ArticleAnalysisResultSchema,
        prompt: buildAnalysisPrompt(input),
        temperature: 0.1,
      });
      return object;
    } catch (err) {
      throw new LlmValidationError(
        `Google adapter analyzeArticle failed: ${err instanceof Error ? err.message : String(err)}`,
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
      });
      return object;
    } catch (err) {
      throw new LlmValidationError(
        `Google adapter matchEntities failed: ${err instanceof Error ? err.message : String(err)}`,
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
      });
      return object;
    } catch (err) {
      throw new LlmValidationError(
        `Google adapter buildDigest failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
