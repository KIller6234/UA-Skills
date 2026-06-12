import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@nih/database';
import { LlmServiceImpl } from '@nih/llm';
import { QUEUE_NAMES, type DigestBuildJobDto, buildRedisConnection } from '@nih/queues';
import { type Env } from '@nih/config';
import { DigestPeriod } from '@prisma/client';

function periodBounds(period: DigestPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (period === 'DAY') {
    start.setDate(start.getDate() - 1);
  } else if (period === 'WEEK') {
    start.setDate(start.getDate() - 7);
  } else {
    start.setMonth(start.getMonth() - 1);
  }
  return { start, end };
}

function periodLabel(period: DigestPeriod, start: Date): string {
  const fmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  const labels: Record<DigestPeriod, string> = {
    DAY: `Щоденний дайджест • ${fmt.format(start)}`,
    WEEK: `Тижневий дайджест • ${fmt.format(start)}`,
    MONTH: `Місячний дайджест • ${fmt.format(start)}`,
  };
  return labels[period];
}

@Injectable()
export class DigestProcessor implements OnApplicationShutdown {
  private readonly worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmServiceImpl,
    config: ConfigService<Env, true>,
  ) {
    const connection = buildRedisConnection(config.get('REDIS_URL', { infer: true }));
    this.worker = new Worker(QUEUE_NAMES.DIGEST_BUILD, (job) => this.process(job), {
      connection,
      concurrency: 2,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    });
  }

  async onApplicationShutdown() {
    await this.worker.close();
  }

  private async process(job: Job<DigestBuildJobDto>): Promise<void> {
    const { userId, period } = job.data;
    const { start, end } = periodBounds(period);

    const articles = await this.prisma.article.findMany({
      where: {
        status: 'CLASSIFIED',
        feedArticles: { some: { userId, firstSeenAt: { gte: start, lte: end } } },
        classifications: { some: { userId } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        publishedAt: true,
        classifications: {
          where: { userId },
          select: { importance: true, summary: true, categoryIds: true },
          take: 1,
        },
        entities: {
          take: 3,
          orderBy: { mentionCount: 'desc' },
          select: { entity: { select: { canonicalName: true, kind: true } } },
        },
      },
    });

    if (!articles.length) return;

    const sorted = articles
      .filter((a) => a.classifications[0])
      .sort((a, b) => (b.classifications[0]?.importance ?? 0) - (a.classifications[0]?.importance ?? 0));

    const topEntities = await this.prisma.entity.findMany({
      where: {
        articles: {
          some: {
            article: { feedArticles: { some: { userId, firstSeenAt: { gte: start, lte: end } } } },
          },
        },
      },
      orderBy: { mentionCount: 'desc' },
      take: 5,
      select: { canonicalName: true },
    });

    const digestResult = await this.llm.buildDigest({
      period: period.toLowerCase() as 'day' | 'week' | 'month',
      topArticleSummaries: sorted.slice(0, 10).map((a) => a.classifications[0]?.summary ?? a.title),
      topEntityNames: topEntities.map((e) => e.canonicalName),
    });

    await this.prisma.digest.upsert({
      where: {
        userId_period_periodStart: {
          userId,
          period,
          periodStart: start,
        },
      },
      create: {
        userId,
        period,
        periodStart: start,
        periodEnd: end,
        title: periodLabel(period, start),
        summary: digestResult.overview,
        articleCount: sorted.length,
        items: {
          create: sorted.slice(0, 20).map((a, i) => ({
            articleId: a.id,
            rank: i + 1,
          })),
        },
      },
      update: {
        summary: digestResult.overview,
        articleCount: sorted.length,
        periodEnd: end,
      },
    });
  }
}
