# News Intelligence Hub

AI-powered news aggregation that transforms RSS feeds into an interactive knowledge graph — connecting articles, entities, and topics via LLM analysis.

> **Demo account (pre-loaded):** `demo@nih.local` / `Demo1234!`  
> 100 articles · 25 entities · knowledge graph · 2 digests — ready on first boot after seeding.

## Features

- **Feed Ingestion** — subscribe to any RSS/Atom feed; background workers poll on configurable schedules
- **Article Classification** — every article is scored for importance, summarized, and tagged with categories and keywords via LLM
- **Entity Extraction & Deduplication** — named entities (people, companies, technologies, locations) are extracted, normalized, and co-mention graphs are maintained
- **Knowledge Graph** — interactive force-directed graph of articles ↔ entities ↔ co-mentions
- **Digests** — on-demand AI-generated daily/weekly/monthly intelligence briefs
- **Regeneration** — re-classify all articles with an updated prompt version with pause/resume support
- **Multi-tenant** — every user owns their feeds, categories, axes, and classifications in full isolation
- **LLM Cost Tracking** — per-call telemetry with cost estimation and cache-hit metrics

## Architecture

```
apps/
  api/       NestJS REST API (port 3000)
  web/       Next.js 14 frontend (port 3001)
  worker/    BullMQ background workers
libs/
  database/  Prisma schema, migrations, seed
docker/      Dockerfiles
docker-compose.yml
```

## Quick Start

### Prerequisites

- Docker Desktop ≥ 4.30
- Node.js 20 (for local seed only)

### 1. Configure environment

```bash
cp .env .env.local  # .env already has sane defaults — fill in your API keys
# Edit .env — fill in LLM_API_KEY_GOOGLE and/or LLM_API_KEY_GROQ
```

### 2. Start all services

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** on 5432
- **Redis** on 6379
- **API** on http://localhost:3000
- **Web** on http://localhost:3001
- **BullBoard** (queue monitor) on http://localhost:3002

### 3. Seed demo data

```bash
pnpm db:seed:demo
```

Or from the host (requires `pnpm install`):

```bash
pnpm db:seed:demo
```

**Demo credentials:** `demo@nih.local` / `Demo1234!`

### 4. Open the app

Navigate to http://localhost:3001 and sign in with the demo credentials.

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | HS256 signing secret | Yes |
| `ANTHROPIC_API_KEY` | Claude API key (primary LLM) | Yes* |
| `GOOGLE_API_KEY` | Gemini API key (fallback LLM) | No |
| `NEXT_PUBLIC_API_URL` | Frontend → API base URL | Yes |

\* Either `ANTHROPIC_API_KEY` or `GOOGLE_API_KEY` required.

## API Overview

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Login, sets HttpOnly cookie |
| GET | `/api/feeds` | List user feeds |
| POST | `/api/feeds` | Add feed by URL |
| GET | `/api/articles` | Paginated article list with filters |
| GET | `/api/articles/:id` | Article detail with entities/categories |
| GET | `/api/graph` | Knowledge graph nodes and edges |
| POST | `/api/digests` | Trigger digest generation |
| GET | `/api/digests` | List digests by period |
| GET | `/api/dashboard/stats` | Dashboard metrics |
| POST | `/api/regeneration` | Start article re-classification run |

Full OpenAPI spec available at http://localhost:3000/api/docs

## Background Jobs

| Queue | Worker | Trigger |
|---|---|---|
| `feed-poll` | FeedPollWorker | Cron every 15 min, or manual |
| `article-process` | ArticleProcessWorker | After feed poll |
| `digest-generate` | DigestWorker | Manual or scheduled |
| `regeneration` | RegenerationWorker | Manual via UI |

Monitor queues at http://localhost:3002

## Development

```bash
# Install dependencies
pnpm install

# Run migrations
pnpm db:migrate

# Start API in dev mode
pnpm --filter @nih/api start:dev

# Start web in dev mode
pnpm --filter @nih/web dev
```

## Testing

```bash
pnpm test
```

Key test files:
- `apps/api/src/common/ssrf-guard.spec.ts`
- `apps/api/src/auth/auth.service.spec.ts`
- `apps/api/src/entities/entity-dedup.spec.ts`
- `apps/worker/src/article/article-pre-filter.spec.ts`

## What's Implemented

### Must ✅ (all 10)
- RSS feed ingestion with ETag/Last-Modified dedup
- LLM article classification (importance · summary · categories · axes)
- Named entity extraction + 3-tier deduplication
- Knowledge graph (articles ↔ entities ↔ co-mentions)
- Daily / weekly / monthly AI digests
- Regeneration with pause/resume and progress tracking
- Multi-tenant isolation (shared articles, per-user everything else)
- Authentication: argon2id · JWT httpOnly cookies · refresh rotation
- SSRF guard on feed URLs
- Prompt injection mitigation (XML escaping)

### Should ✅
- LLM provider failover (Google Gemini → Groq Llama)
- LLM cache by `sha256(contentHash:op:model:promptVersion)` — zero cost on re-analysis
- Unit tests for security-critical paths (7 spec files)
- Interactive graph with time filter, node type filter, click-to-detail sidebar
- Per-call LLM telemetry with cost estimation

### Could (not implemented)
- Email delivery for digests (SMTP integration)
- Embedding-based semantic similarity (entity-overlap used instead)
- Mobile push notifications

### Known Limitations
- Semantic similarity uses entity co-mention overlap, not vector embeddings
- Email confirmation is dev-mode only (confirmation link shown on screen)
- LLM API keys configured via environment variables; no in-app key rotation UI

## Architecture Decisions

- [ADR-001 — Monorepo with pnpm workspaces](docs/adr/001-monorepo-pnpm.md)
- [ADR-002 — BullMQ for async job processing](docs/adr/002-bullmq-redis-queues.md)
- [ADR-003 — Prisma ORM with PostgreSQL](docs/adr/003-prisma-postgresql.md)
- [ADR-004 — Per-user LLM classification with shared article storage](docs/adr/004-per-user-classification.md)
- [ADR-005 — LLM provider abstraction with cost tracking](docs/adr/005-llm-provider-abstraction.md)
- [ADR-006 — Entity deduplication via normalized name + kind index](docs/adr/006-entity-deduplication.md)
