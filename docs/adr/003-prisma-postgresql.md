# ADR-003 — Prisma ORM with PostgreSQL

**Status:** Accepted  
**Date:** 2026-05-02

## Context

The data model is relational: users own feeds, feeds contain articles via a join table, articles have many-to-many relationships with entities and categories. We needed an ORM that supports:

- Type-safe queries from TypeScript
- Schema migrations with version history
- Efficient join queries for graph traversal

Candidates: Drizzle ORM, TypeORM, MikroORM, Prisma.

## Decision

Use **Prisma ORM** with **PostgreSQL 16**.

## Rationale

1. **Generated client** — Prisma generates a fully-typed query client from `schema.prisma`; the `@nih/database` lib re-exports it so all apps share the same client version.
2. **Migration history** — `prisma migrate dev/deploy` maintains a `_prisma_migrations` table; no manual SQL scripts to track.
3. **Relation queries** — `include` / `select` clauses enable precise eager loading without N+1; the `ArticleSimilar` self-join and `EntityCoMention` undirected graph are expressible in the schema.
4. **PostgreSQL-specific indexes** — `@@index([publishedAt(sort: Desc)])` and partial indexes are first-class schema primitives.

## Consequences

- Prisma's `binaryTargets` must include `linux-musl-openssl-3.0.x` for the Alpine-based Docker images.
- `PrismaService` wraps `PrismaClient` as a NestJS injectable and calls `$connect()` / `$disconnect()` on lifecycle hooks.
- Raw SQL is used sparingly (only for the co-mention graph aggregation query) via `prisma.$queryRaw`.
