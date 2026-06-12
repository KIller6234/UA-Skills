import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@nih/database';
import { QUEUE_NAMES, type RegenerateJobDto, buildRedisConnection } from '@nih/queues';
import { type Env } from '@nih/config';
import { LlmServiceImpl } from '@nih/llm';
import { ArticlePreFilter } from '@nih/common';
import { EntityDedupService } from '@nih/ner';

const PROMPT_VERSION = '1';
const BATCH_SIZE = 5;
const COST_PER_BATCH_USD = 0.005;

@Injectable()
export class RegenerateProcessor implements OnApplicationShutdown {
  private readonly logger = new Logger(RegenerateProcessor.name);
  private readonly worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmServiceImpl,
    private readonly preFilter: ArticlePreFilter,
    private readonly entityDedup: EntityDedupService,
    config: ConfigService<Env, true>,
  ) {
    const connection = buildRedisConnection(config.get('REDIS_URL', { infer: true }));
    this.worker = new Worker(QUEUE_NAMES.ARTICLE_REGENERATE, (job) => this.process(job), {
      connection,
      concurrency: 1,
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 5 },
    });
  }

  async onApplicationShutdown() {
    await this.worker.close();
  }

  private async process(job: Job<RegenerateJobDto>): Promise<void> {
    const { userId, runId } = job.data;

    const run = await this.prisma.regenerationRun.findUnique({ where: { id: runId } });
    if (!run || run.status === 'PAUSED') return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        categories: { select: { name: true } },
        axes: {
          select: { key: true, label: true, values: { select: { value: true } } },
        },
      },
    });
    if (!user) return;

    const axes = user.axes.map((a) => ({
      key: a.key,
      label: a.label,
      values: a.values.map((v) => v.value),
    }));
    const userCategories = user.categories.map((c) => c.name);
    const maxChars = 4000 * 4;

    const allArticles = await this.prisma.article.findMany({
      where: { feedArticles: { some: { userId } } },
      select: { id: true, contentHash: true, title: true, bodyText: true, wordCount: true },
    });

    const total = allArticles.length;
    await this.prisma.regenerationRun.update({ where: { id: runId }, data: { totalArticles: total } });

    const unclassified = await this.filterUnclassified(userId, allArticles);
    const alreadyDone = total - unclassified.length;

    let batchCalls = 0;
    let processedNew = 0;

    for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
      const paused = await this.prisma.regenerationRun.findUnique({
        where: { id: runId }, select: { status: true },
      });
      if (paused?.status === 'PAUSED') return;

      const batch = unclassified.slice(i, i + BATCH_SIZE);
      const inputs = batch.map((a) => ({
        contentHash: a.contentHash,
        title: a.title,
        bodyText: a.bodyText.slice(0, maxChars),
        userCategories,
        axes,
        promptVersion: PROMPT_VERSION,
      }));

      try {
        const results = await this.llm.analyzeArticleBatch(inputs);
        await this.saveClassifications(userId, batch, results);
        batchCalls++;
      } catch (err) {
        this.logger.error({ event: 'regenerate_batch_failed', runId, error: String(err) });
      }

      processedNew += batch.length;
      const progress = Math.round(((alreadyDone + processedNew) / total) * 100);

      await this.prisma.regenerationRun.update({
        where: { id: runId },
        data: {
          processedArticles: alreadyDone + processedNew,
          progress,
          llmCalls: batchCalls,
          estimatedCostUsd: parseFloat((batchCalls * COST_PER_BATCH_USD).toFixed(4)),
        },
      });
      await job.updateProgress(progress);
    }

    await this.prisma.regenerationRun.update({
      where: { id: runId },
      data: { status: 'COMPLETED', completedAt: new Date(), progress: 100 },
    });

    this.logger.log({ event: 'regeneration_complete', runId, userId, batchCalls, total });
  }

  private async filterUnclassified(
    userId: string,
    articles: { id: string; contentHash: string; title: string; bodyText: string; wordCount: number }[],
  ) {
    const existing = await this.prisma.articleClassification.findMany({
      where: { userId, articleId: { in: articles.map((a) => a.id) }, promptVersion: PROMPT_VERSION },
      select: { articleId: true },
    });
    const classifiedIds = new Set(existing.map((e) => e.articleId));
    return articles.filter((a) => !classifiedIds.has(a.id) && this.preFilter.filter(a).pass);
  }

  private async saveClassifications(
    userId: string,
    batch: { id: string }[],
    results: Awaited<ReturnType<LlmServiceImpl['analyzeArticleBatch']>>,
  ) {
    const importanceMap = { high: 80, normal: 50, junk: 10 } as const;

    await Promise.all(
      batch.map(async (article, idx) => {
        const analysis = results[idx]!;
        const entities = await this.entityDedup.findOrCreate(analysis.entities);
        const allCategories = await this.prisma.userCategory.findMany({
          where: { userId, name: { in: analysis.categories } },
          select: { id: true },
        });

        await this.prisma.$transaction([
          this.prisma.articleClassification.upsert({
            where: {
              userId_articleId_promptVersion: {
                userId,
                articleId: article.id,
                promptVersion: PROMPT_VERSION,
              },
            },
            create: {
              userId,
              articleId: article.id,
              importance: importanceMap[analysis.importance],
              summary: analysis.summary,
              axisValues: analysis.axisValues,
              categoryIds: allCategories.map((c) => c.id),
              keywords: analysis.entities.map((e) => e.name).slice(0, 10),
              model: 'batch',
              promptVersion: PROMPT_VERSION,
            },
            update: {
              importance: importanceMap[analysis.importance],
              summary: analysis.summary,
              axisValues: analysis.axisValues,
              categoryIds: allCategories.map((c) => c.id),
            },
          }),
          ...entities.map((entity) =>
            this.prisma.articleEntity.upsert({
              where: { articleId_entityId: { articleId: article.id, entityId: entity.id } },
              create: { articleId: article.id, entityId: entity.id, mentionCount: 1 },
              update: { mentionCount: { increment: 1 } },
            }),
          ),
          this.prisma.article.update({
            where: { id: article.id },
            data: { status: 'CLASSIFIED' },
          }),
        ]);
      }),
    );
  }
}
