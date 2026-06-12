/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@nih/database';
import { Prisma } from '@prisma/client';

type Period = '7d' | '30d' | 'all';

function periodStart(period: Period): Date | undefined {
  if (period === 'all') {return undefined;}
  const days = period === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function deltaPct(current: number, previous: number): string {
  if (previous === 0) {return current > 0 ? '+100%' : '0%';}
  const pct = ((current - previous) / previous) * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string, period: Period) {
    const from = periodStart(period);
    const days = period === '7d' ? 7 : 30;
    const prevFrom = from
      ? new Date(from.getTime() - days * 24 * 60 * 60 * 1000)
      : undefined;

    const [
      articlesProcessed,
      prevArticles,
      entitiesFound,
      activeFeeds,
      llmCallsThisMonth,
      prevLlmCalls,
      importanceCounts,
      topCategories,
      topEntities,
      recentArticles,
      activityRaw,
    ] = await Promise.all([
      // Articles processed in period (CLASSIFIED or FILTERED)
      this.prisma.feedArticle.count({
        where: {
          userId,
          ...(from ? { firstSeenAt: { gte: from } } : {}),
        },
      }),
      // Previous period articles
      prevFrom && from
        ? this.prisma.feedArticle.count({
            where: { userId, firstSeenAt: { gte: prevFrom, lt: from } },
          })
        : Promise.resolve(0),
      // Entities found for user's articles
      this.prisma.articleEntity.count({
        where: {
          article: { feedArticles: { some: { userId } } },
          ...(from ? { article: { feedArticles: { some: { userId, firstSeenAt: { gte: from } } } } } : {}),
        },
      }),
      // Active feeds
      this.prisma.feed.count({ where: { userId, status: 'ACTIVE' } }),
      // LLM calls this month
      this.prisma.llmTelemetry.count({
        where: {
          userId,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      // Previous month LLM calls
      this.prisma.llmTelemetry.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // Importance breakdown
      this.prisma.articleClassification.groupBy({
        by: ['importance'],
        where: { userId, ...(from ? { createdAt: { gte: from } } : {}) },
        _count: { importance: true },
      }),
      // Top categories
      this.prisma.$queryRaw<{ name: string; count: bigint }[]>`
        SELECT uc.name, COUNT(ac.id) as count
        FROM "UserCategory" uc
        LEFT JOIN "ArticleClassification" ac
          ON uc.id = ANY(ac."categoryIds") AND ac."userId" = ${userId}
        WHERE uc."userId" = ${userId}
        GROUP BY uc.id, uc.name
        ORDER BY count DESC
        LIMIT 6
      `,
      // Top entities
      this.prisma.entity.findMany({
        where: { articles: { some: { article: { feedArticles: { some: { userId } } } } } },
        orderBy: { mentionCount: 'desc' },
        take: 6,
        select: { id: true, canonicalName: true, kind: true, mentionCount: true },
      }),
      // Recent classified articles
      this.prisma.article.findMany({
        where: {
          feedArticles: { some: { userId } },
          status: 'CLASSIFIED',
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          title: true,
          sourceDomain: true,
          publishedAt: true,
          classifications: {
            where: { userId },
            select: { importance: true },
            take: 1,
          },
          feedArticles: {
            where: { userId },
            select: { feed: { select: { title: true } } },
            take: 1,
          },
        },
      }),
      // Activity chart: articles + LLM calls per day
      this.prisma.$queryRaw<{ date: Date; articles: bigint; llmCalls: bigint }[]>(
        Prisma.sql`
          SELECT
            COALESCE(a.date, l.date) as date,
            COALESCE(a.articles, 0) as articles,
            COALESCE(l."llmCalls", 0) as "llmCalls"
          FROM (
            SELECT DATE_TRUNC('day', fa."firstSeenAt") as date,
                   COUNT(DISTINCT fa."articleId") as articles
            FROM "FeedArticle" fa
            WHERE fa."userId" = ${userId}
              ${from ? Prisma.sql`AND fa."firstSeenAt" >= ${from}` : Prisma.empty}
            GROUP BY 1
          ) a
          FULL OUTER JOIN (
            SELECT DATE_TRUNC('day', lt."createdAt") as date,
                   COUNT(*) as "llmCalls"
            FROM "LlmTelemetry" lt
            WHERE lt."userId" = ${userId}
              ${from ? Prisma.sql`AND lt."createdAt" >= ${from}` : Prisma.empty}
            GROUP BY 1
          ) l ON a.date = l.date
          ORDER BY 1 ASC
        `
      ),
    ]);

    const totalImportance = importanceCounts.reduce((s, r) => s + r._count.importance, 0) || 1;
    const importanceMap = Object.fromEntries(
      importanceCounts.map((r) => [r.importance, r._count.importance]),
    );

    return {
      articlesProcessed: {
        value: articlesProcessed,
        delta: deltaPct(articlesProcessed, prevArticles),
      },
      entitiesFound: { value: entitiesFound, delta: '+0%' },
      activeFeedsCount: { value: activeFeeds, delta: '' },
      llmCallsThisMonth: {
        value: llmCallsThisMonth,
        delta: deltaPct(llmCallsThisMonth, prevLlmCalls),
      },
      importanceBreakdown: {
        high:   Math.round(((importanceMap[80] ?? 0) / totalImportance) * 100),
        normal: Math.round(((importanceMap[50] ?? 0) / totalImportance) * 100),
        junk:   Math.round(((importanceMap[10] ?? 0) / totalImportance) * 100),
      },
      topCategories: (topCategories as { name: string; count: bigint }[]).map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      topEntities: topEntities.map((e) => ({
        id: e.id,
        name: e.canonicalName,
        kind: e.kind,
        count: e.mentionCount,
      })),
      recentArticles: recentArticles.map((a) => ({
        id: a.id,
        title: a.title,
        sourceDomain: a.sourceDomain,
        publishedAt: a.publishedAt,
        importance: a.classifications[0]?.importance ?? null,
        feedTitle: a.feedArticles[0]?.feed.title ?? null,
      })),
      activityChart: (activityRaw as { date: Date; articles: bigint }[]).map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        articles: Number(r.articles),
        llmCalls: 0,
      })),
    };
  }

  async getLlmStats(userId: string) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalCalls, costAgg, cacheHits, byOperation, dailyRaw] = await Promise.all([
      this.prisma.llmTelemetry.count({
        where: { userId, createdAt: { gte: monthStart } },
      }),
      this.prisma.llmTelemetry.aggregate({
        where: { userId, createdAt: { gte: monthStart } },
        _sum: { costUsd: true },
        _count: { cacheHit: true },
      }),
      this.prisma.llmTelemetry.count({
        where: { userId, createdAt: { gte: monthStart }, cacheHit: true },
      }),
      this.prisma.llmTelemetry.groupBy({
        by: ['operation'],
        where: { userId, createdAt: { gte: monthStart } },
        _count: { operation: true },
      }),
      this.prisma.$queryRaw<{ date: Date; calls: bigint }[]>(
        Prisma.sql`
          SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as calls
          FROM "LlmTelemetry"
          WHERE "userId" = ${userId}
            AND "createdAt" >= ${sevenDaysAgo}
          GROUP BY 1
          ORDER BY 1 ASC
        `
      ),
    ]);

    const cacheHitRate = totalCalls > 0 ? Math.round((cacheHits / totalCalls) * 100) : 0;

    return {
      totalCallsThisMonth: totalCalls,
      totalCostThisMonth: Number((costAgg._sum.costUsd ?? 0).toFixed(4)),
      cacheHitRatePct: cacheHitRate,
      callsByOperation: Object.fromEntries(
        byOperation.map((r) => [r.operation, r._count.operation]),
      ) as Record<string, number>,
      dailyCallsLast7Days: (dailyRaw as { date: Date; calls: bigint }[]).map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        calls: Number(r.calls),
      })),
    };
  }
}
