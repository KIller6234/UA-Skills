/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-redundant-type-constituents */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@nih/database';
import { Prisma } from '@prisma/client';

export interface ArticlesQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  feedId?: string;
  importance?: 'high' | 'normal' | 'junk';
  from?: string;
  to?: string;
  q?: string;
}

const importanceValue = { high: 80, normal: 50, junk: 10 } as const;

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: ArticlesQuery) {
    const page  = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)));
    const skip  = (page - 1) * limit;

    const feedArticleWhere: Prisma.FeedArticleWhereInput = {
      userId,
      ...(query.feedId ? { feedId: query.feedId } : {}),
      ...(query.from || query.to
        ? { firstSeenAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
    };

    const classificationWhere: Prisma.ArticleClassificationWhereInput | undefined =
      query.categoryId || query.importance
        ? {
            userId,
            ...(query.categoryId ? { categoryIds: { has: query.categoryId } } : {}),
            ...(query.importance ? { importance: { equals: importanceValue[query.importance] } } : {}),
          }
        : undefined;

    const where: Prisma.ArticleWhereInput = {
      feedArticles: { some: feedArticleWhere },
      ...(query.q ? {
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { bodyText: { contains: query.q, mode: 'insensitive' } },
        ],
      } : {}),
      ...(classificationWhere ? { classifications: { some: classificationWhere } } : {}),
    };

    const select = {
      id: true,
      title: true,
      sourceDomain: true,
      publishedAt: true,
      status: true,
      classifications: {
        where: { userId },
        select: { importance: true, categoryIds: true, axisValues: true },
        take: 1,
      },
      entities: {
        take: 3,
        select: { entity: { select: { id: true, canonicalName: true, kind: true } } },
      },
      feedArticles: {
        where: { userId },
        take: 1,
        select: { feed: { select: { id: true, title: true } } },
      },
      _count: { select: { similarA: true } },
    } satisfies Prisma.ArticleSelect;

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({ where, orderBy: { publishedAt: 'desc' }, skip, take: limit, select }),
      this.prisma.article.count({ where }),
    ]);

    return {
      items: items.map((a) => ({
        id: a.id,
        title: a.title,
        sourceDomain: a.sourceDomain,
        publishedAt: a.publishedAt,
        status: a.status,
        importance: a.classifications[0]?.importance ?? null,
        axisValues: (a.classifications[0]?.axisValues ?? {}) as Record<string, string>,
        categoryIds: a.classifications[0]?.categoryIds ?? [],
        entities: a.entities.map((e: { entity: { id: string; canonicalName: string; kind: string } }) => e.entity),
        feedId: a.feedArticles[0]?.feed.id ?? null,
        feedTitle: a.feedArticles[0]?.feed.title ?? null,
        similarCount: a._count.similarA,
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(userId: string, id: string) {
    const article = await this.prisma.article.findFirst({
      where: { id, feedArticles: { some: { userId } } },
      include: {
        classifications: {
          where: { userId },
          select: { importance: true, summary: true, axisValues: true, categoryIds: true, keywords: true },
          take: 1,
        },
        entities: {
          include: { entity: { select: { id: true, canonicalName: true, kind: true } } },
          orderBy: { mentionCount: 'desc' },
        },
        feedArticles: {
          where: { userId },
          include: { feed: { select: { id: true, title: true } } },
          take: 1,
        },
      },
    });
    if (!article) {throw new NotFoundException('Article not found');}

    const categoryIds = article.classifications[0]?.categoryIds ?? [];
    const categories = categoryIds.length
      ? await this.prisma.userCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, color: true },
        })
      : [];

    return {
      id: article.id,
      title: article.title,
      bodyText: article.bodyText,
      canonicalUrl: article.canonicalUrl,
      sourceDomain: article.sourceDomain,
      publishedAt: article.publishedAt,
      status: article.status,
      importance: article.classifications[0]?.importance ?? null,
      summary: article.classifications[0]?.summary ?? null,
      axisValues: (article.classifications[0]?.axisValues ?? {}) as Record<string, string>,
      keywords: article.classifications[0]?.keywords ?? [],
      categories,
      entities: article.entities.map((e) => ({ ...e.entity, mentionCount: e.mentionCount })),
      feedTitle: article.feedArticles[0]?.feed.title ?? null,
    };
  }

  async findSimilar(userId: string, id: string) {
    const [topEntities, sourceClassification] = await Promise.all([
      this.prisma.articleEntity.findMany({
        where: { articleId: id, article: { feedArticles: { some: { userId } } } },
        orderBy: { mentionCount: 'desc' },
        take: 5,
        select: { entityId: true },
      }),
      this.prisma.articleClassification.findFirst({
        where: { articleId: id, userId },
        select: { keywords: true },
      }),
    ]);

    const entityIds = topEntities.map((e) => e.entityId);
    const keywords = (sourceClassification?.keywords ?? []) as string[];

    if (!entityIds.length && !keywords.length) {return [];}

    const candidates = await this.prisma.article.findMany({
      where: {
        id: { not: id },
        feedArticles: { some: { userId } },
        OR: [
          ...(entityIds.length ? [{ entities: { some: { entityId: { in: entityIds } } } }] : []),
          ...(keywords.length ? [{ classifications: { some: { userId, keywords: { hasSome: keywords } } } }] : []),
        ],
      },
      take: 20,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true, title: true, sourceDomain: true, publishedAt: true,
        entities: { select: { entityId: true } },
        classifications: { where: { userId }, take: 1, select: { keywords: true } },
        feedArticles: { where: { userId }, take: 1, select: { feed: { select: { title: true } } } },
      },
    });

    const entitySet = new Set(entityIds);
    const keywordSet = new Set(keywords.map((k) => k.toLowerCase()));

    const scored = candidates.map((a) => {
      const entityOverlap = a.entities.filter((e) => entitySet.has(e.entityId)).length;
      const candidateKws = ((a.classifications[0]?.keywords ?? []) as string[]).map((k) => k.toLowerCase());
      const keywordOverlap = candidateKws.filter((k) => keywordSet.has(k)).length;
      return { ...a, _score: entityOverlap * 2 + keywordOverlap };
    });

    return scored
      .sort((a, b) => b._score - a._score || new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime())
      .slice(0, 5)
      .map(({ entities: _e, classifications: _c, _score: _s, ...rest }) => rest);
  }
}
