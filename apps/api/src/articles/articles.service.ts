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
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
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
    const topEntities = await this.prisma.articleEntity.findMany({
      where: { articleId: id, article: { feedArticles: { some: { userId } } } },
      orderBy: { mentionCount: 'desc' },
      take: 3,
      select: { entityId: true },
    });
    if (!topEntities.length) {return [];}

    const entityIds = topEntities.map((e) => e.entityId);
    return this.prisma.article.findMany({
      where: { id: { not: id }, feedArticles: { some: { userId } }, entities: { some: { entityId: { in: entityIds } } } },
      take: 5,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true, title: true, sourceDomain: true, publishedAt: true,
        feedArticles: { where: { userId }, take: 1, select: { feed: { select: { title: true } } } },
      },
    });
  }
}
