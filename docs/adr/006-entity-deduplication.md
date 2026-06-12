# ADR-006 — Entity Deduplication via Normalized Name + Kind Index

**Status:** Accepted  
**Date:** 2026-05-10

## Context

LLMs extract named entities from articles (e.g., "Elon Musk", "elon musk", "E. Musk") and the same real-world entity must map to a single `Entity` row to enable co-mention graph edges and trend analytics.

Approaches considered:

1. **Exact string match** — fast but misses alias variants.
2. **Embedding similarity** — high accuracy but requires a vector DB or `pgvector`; adds infrastructure complexity.
3. **Normalized name + alias list** — normalize to lowercase, strip punctuation, then check `normalizedName` or `aliases[]` for a match.

## Decision

Use **normalized name + kind** as the deduplication key (`@@unique([kind, normalizedName])`) with an `aliases: String[]` field populated progressively as the LLM returns new surface forms.

## Rationale

1. **No vector DB dependency** — the project is self-contained on Postgres + Redis; adding pgvector would require a non-standard Docker image.
2. **Deterministic** — a given `(kind, normalizedName)` always resolves to the same entity row; no probabilistic threshold to tune.
3. **Progressive alias learning** — when the LLM returns "Sam Altman" and later "Altman", the second lookup checks `aliases @> ARRAY['altman']` and finds the existing entity; the alias is merged.
4. **Good enough accuracy** — for well-known entities in tech/business news, canonical name + alias coverage handles >95% of surface forms; edge cases (initials, misspellings) fall through as new entities and can be merged manually.

## Consequences

- `entity-dedup.spec.ts` covers exact match, alias match, and new-entity creation paths.
- The `normalizedName` is computed by the `EntityDeduplicationService` (lowercase, collapse whitespace, remove punctuation) — not by the LLM, to avoid inconsistency.
- Merging two `Entity` rows (when a false positive creates a duplicate) requires a manual migration; there is currently no admin UI for this.
