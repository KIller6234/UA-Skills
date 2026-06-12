# ADR-001 — Monorepo with pnpm Workspaces

**Status:** Accepted  
**Date:** 2026-05-01

## Context

NIH consists of three runnable services (API, web, worker) and shared code (database schema, DTOs, utility libs). We needed to decide whether to manage these as separate repositories or as a single monorepo.

## Decision

Use a **pnpm workspace monorepo** with the structure:

```
apps/api      — NestJS REST API
apps/web      — Next.js frontend
apps/worker   — BullMQ background workers
libs/database — Prisma schema + generated client
```

## Rationale

1. **Single source of truth for shared types** — `libs/database` exports Prisma-generated types used by all three apps; no hand-rolled DTO duplication.
2. **Atomic changes** — a Prisma schema migration and its corresponding service code can land in one commit.
3. **pnpm efficiency** — content-addressable store avoids duplicating `node_modules` across packages; install times are ~3× faster than npm/yarn for this topology.
4. **Docker builds remain independent** — each service has its own Dockerfile that copies only its slice of the workspace, so image sizes stay small.

## Consequences

- Local development requires pnpm ≥ 9; contributors on npm/yarn need to switch.
- TypeScript `composite: true` + project references must be maintained to avoid accidental circular deps.
- CI must run `pnpm install --frozen-lockfile` to ensure reproducible builds.
