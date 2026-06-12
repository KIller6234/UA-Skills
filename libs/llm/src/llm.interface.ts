import { z } from 'zod';

// ─── Input / Output schemas ───────────────────────────────────────────────────

export interface AxisDefinition {
  key: string;
  label: string;
  values: string[];
}

export interface ArticleAnalysisInput {
  contentHash: string;
  title: string;
  bodyText: string;
  userCategories: string[];
  axes: AxisDefinition[];
  promptVersion: string;
}

export interface EntityMatchInput {
  candidate: string;
  options: string[];
}

export interface DigestInput {
  period: 'day' | 'week' | 'month';
  topArticleSummaries: string[];
  topEntityNames: string[];
}

// ─── Zod response schemas (shared by all adapters) ───────────────────────────

export const ExtractedEntitySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['person', 'company', 'product', 'technology', 'location', 'other']),
  confidence: z.number().min(0).max(1),
});

export const ArticleAnalysisResultSchema = z.object({
  entities: z.array(ExtractedEntitySchema),
  summary: z.string().min(10).max(600),
  importance: z.enum(['high', 'normal', 'junk']),
  axisValues: z.record(z.string()),
  categories: z.array(z.string()),
});

export const EntityMatchResultSchema = z.object({
  matchedName: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export const DigestResultSchema = z.object({
  overview: z.string().min(20).max(1000),
});

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;
export type ArticleAnalysisResult = z.infer<typeof ArticleAnalysisResultSchema>;
export type EntityMatchResult = z.infer<typeof EntityMatchResultSchema>;
export type DigestResult = z.infer<typeof DigestResultSchema>;

export const BatchAnalysisResultSchema = z.object({
  results: z.array(ArticleAnalysisResultSchema),
});
export type BatchAnalysisResult = z.infer<typeof BatchAnalysisResultSchema>;

// ─── Service interface ────────────────────────────────────────────────────────

export interface LlmService {
  analyzeArticle(input: ArticleAnalysisInput): Promise<ArticleAnalysisResult>;
  analyzeArticleBatch(inputs: ArticleAnalysisInput[]): Promise<ArticleAnalysisResult[]>;
  matchEntities(input: EntityMatchInput): Promise<EntityMatchResult>;
  buildDigest(input: DigestInput): Promise<DigestResult>;
}

// ─── Provider adapter interface ───────────────────────────────────────────────

export interface LlmProviderAdapter {
  readonly name: string;
  analyzeArticle(input: ArticleAnalysisInput): Promise<ArticleAnalysisResult>;
  analyzeArticleBatch(inputs: ArticleAnalysisInput[]): Promise<ArticleAnalysisResult[]>;
  matchEntities(input: EntityMatchInput): Promise<EntityMatchResult>;
  buildDigest(input: DigestInput): Promise<DigestResult>;
}

// ─── Custom errors ────────────────────────────────────────────────────────────

export class LlmValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmValidationError';
  }
}

export class LlmUnavailableError extends Error {
  constructor(message = 'All LLM providers are unavailable') {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}
