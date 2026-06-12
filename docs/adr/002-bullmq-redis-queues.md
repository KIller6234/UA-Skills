# ADR-002 — BullMQ for Async Job Processing

**Status:** Accepted  
**Date:** 2026-05-02

## Context

Feed polling, article processing (download + LLM classification), digest generation, and regeneration runs are all long-running or bursty operations that must not block HTTP request handling. We evaluated:

- **Direct cron inside API process** — simpler, but ties latency of HTTP responses to LLM call times and risks OOM under bursty load.
- **AWS SQS / GCP Pub/Sub** — managed, but requires cloud credentials; overkill for a self-hosted competition project.
- **BullMQ + Redis** — battle-tested Node.js job queue backed by Redis streams.

## Decision

Use **BullMQ** for all background work, running workers in a dedicated `apps/worker` process.

## Rationale

1. **Decoupling** — the API enqueues jobs and returns immediately; workers consume at their own pace.
2. **Visibility** — BullBoard provides a real-time dashboard at `:3002` with job counts, retry logs, and failure details.
3. **Retry semantics** — exponential backoff with configurable `attempts` prevents thundering-herd re-tries on LLM rate limits.
4. **Redis already in stack** — Redis was already required for JWT refresh-token blacklisting; no extra infrastructure.
5. **Pause/resume** — BullMQ supports pausing queues natively, enabling the regeneration pause/resume feature with zero extra code.

## Consequences

- Worker process must share `DATABASE_URL` and `REDIS_URL` with the API; managed via shared Docker Compose env.
- Redis persistence (`appendonly yes`) must be enabled in production to survive restarts without losing queued jobs.
- BullMQ `retryStrategy` must handle the Redis `ECONNREFUSED` race condition on container startup (addressed in `queues.service.ts`).
