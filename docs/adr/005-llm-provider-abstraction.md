# ADR-005 — LLM Provider Abstraction with Cost Tracking

**Status:** Accepted  
**Date:** 2026-05-08

## Context

The project needs to call LLMs for article classification, digest generation, and entity extraction. Cloud LLM APIs (Anthropic, Google, OpenAI) each have different SDKs, rate limits, pricing, and reliability characteristics. Locking into one provider creates vendor risk.

## Decision

Implement an **`LlmAdapter` interface** with concrete `AnthropicAdapter` and `GoogleAdapter` implementations, injected via NestJS DI. Add **`LlmTelemetry`** rows on every call for cost accounting.

```
LlmAdapter (interface)
  ├── AnthropicAdapter  → claude-haiku-4-5 (default classification)
  └── GoogleAdapter     → gemini-flash (fallback / digest generation)
```

## Rationale

1. **Failover** — if Anthropic returns a 529 rate-limit, the orchestration service can retry with the Google adapter.
2. **Cost control** — `LlmTelemetry` records `tokensInput`, `tokensOutput`, `costUsd`, `cacheHit` per call; the dashboard aggregates monthly spend.
3. **Prompt version tracking** — `LlmCache` is keyed by `(contentHash, promptVersion, model)`, so a prompt upgrade invalidates the cache cleanly.
4. **Testability** — unit tests inject a `MockLlmAdapter` that returns deterministic JSON without any HTTP calls.

## Consequences

- SSRF guard (`ssrf-guard.ts`) must validate all outbound URLs before each adapter call; the spec file covers private IP ranges and localhost.
- `estimatedCostUsd` on `RegenerationRun` and `DigestJob` is computed by summing `LlmTelemetry.costUsd` during the run — it is an estimate because pricing can change.
- At least one of `ANTHROPIC_API_KEY` or `GOOGLE_API_KEY` must be set; the `LlmModule` throws at startup if neither is present.
