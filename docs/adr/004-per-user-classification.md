# ADR-004 — Per-User LLM Classification with Shared Article Storage

**Status:** Accepted  
**Date:** 2026-05-05

## Context

Articles from public RSS feeds are globally deduplicated by `canonicalUrl` — the same BBC article should not be stored twice even if two users subscribe to the same feed. However, each user has different categories, axes, and importance thresholds, so classification results must be per-user.

Two models were considered:

1. **Fully per-user storage** — clone the `Article` row per user; simple but wastes storage and LLM calls for shared content.
2. **Shared articles + per-user classification** — store the article body once; store `ArticleClassification` per `(userId, articleId, promptVersion)`.

## Decision

Use **shared `Article` rows** with a separate **`ArticleClassification`** table keyed by `(userId, articleId, promptVersion)`.

## Rationale

1. **LLM cache efficiency** — if two users subscribe to the same feed, only one LLM call is needed (cache key = content hash + prompt version). The `ArticleClassification` for user B can re-use the cached result from user A.
2. **Storage efficiency** — article body text is stored once regardless of how many users see it.
3. **Regeneration scope** — when a user triggers regeneration, only their `ArticleClassification` rows need updating; the shared `Article` rows are untouched.
4. **Prompt versioning** — `promptVersion` in the classification table allows running new and old prompts in parallel during A/B evaluation.

## Consequences

- All article queries must join `ArticleClassification` on `userId` to get importance/categories; raw `Article` queries are only used by background workers.
- `FeedArticle` is a per-user join table linking a user's feed to a globally shared article.
- `ArticleClassification.categoryIds` stores `UserCategory.id` values, which are user-scoped — referential integrity is enforced at the application layer, not the DB.
