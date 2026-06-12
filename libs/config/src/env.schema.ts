import { z } from 'zod';

export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),
  REDIS_PASSWORD: z.string().min(1),
  REDIS_MAX_MEMORY: z.string().default('256mb'),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TTL: z.coerce.number().default(604800),

  // LLM
  LLM_PRIMARY_PROVIDER: z.enum(['google', 'groq']).default('google'),
  LLM_FALLBACK_PROVIDER: z.enum(['google', 'groq']).default('groq'),
  LLM_MODEL_GOOGLE: z.string().default('gemini-1.5-flash'),
  LLM_MODEL_GROQ: z.string().default('llama-3.1-8b-instant'),
  LLM_API_KEY_GOOGLE: z.string().optional(),
  LLM_API_KEY_GROQ: z.string().optional(),
  LLM_CONCURRENCY: z.coerce.number().default(3),
  LLM_MAX_INPUT_TOKENS: z.coerce.number().default(2000),
  LLM_PROMPT_VERSION: z.string().default('v1'),

  // Feed polling
  FEED_POLL_INTERVAL_SECONDS: z.coerce.number().default(3600),
  FEED_MAX_CONCURRENT_POLLS: z.coerce.number().default(5),
  FEED_FETCH_TIMEOUT_MS: z.coerce.number().default(10000),
  FEED_MAX_FAILURES_BEFORE_ERROR: z.coerce.number().default(5),

  // Pre-filter
  PREFILTER_MIN_WORD_COUNT: z.coerce.number().default(50),
  PREFILTER_MIN_BODY_LENGTH: z.coerce.number().default(200),

  // Workers
  WORKER_REPLICAS: z.coerce.number().default(1),

  // Bull Board
  BULL_BOARD_USER: z.string().min(1),
  BULL_BOARD_PASS: z.string().min(8),

  // Email (optional — email sending skipped when not set)
  RESEND_API_KEY: z.string().optional(),

  // OAuth providers (optional — OAuth disabled when not set)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // App
  FRONTEND_URL: z.string().default('http://localhost:3001'),
  SHOW_BULL_BOARD_LINK: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
});

export type Env = z.infer<typeof envSchema>;
