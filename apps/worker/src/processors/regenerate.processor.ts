import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@nih/database';
import { QueuesService, QUEUE_NAMES, type RegenerateJobDto, buildRedisConnection } from '@nih/queues';
import { type Env } from '@nih/config';

const PROMPT_VERSION = '1';
const COST_PER_LLM_CALL_USD = 0.002;

@Injectable()
export class RegenerateProcessor implements OnApplicationShutdown {
  private readonly worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
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

    const articles = await this.prisma.article.findMany({
      where: { feedArticles: { some: { userId } } },
      select: { id: true },
    });

    const total = articles.length;
    await this.prisma.regenerationRun.update({
      where: { id: runId },
      data: { totalArticles: total },
    });

    let processed = 0;
    let llmCalls = 0;

    for (const article of articles) {
      const currentRun = await this.prisma.regenerationRun.findUnique({
        where: { id: runId },
        select: { status: true },
      });
      if (currentRun?.status === 'PAUSED') return;

      const existing = await this.prisma.articleClassification.findFirst({
        where: { userId, articleId: article.id, promptVersion: PROMPT_VERSION },
      });

      if (!existing) {
        await this.queues.addArticleProcessJob({ articleId: article.id, userId });
        llmCalls++;
      }

      processed++;
      const progress = Math.round((processed / total) * 100);

      await this.prisma.regenerationRun.update({
        where: { id: runId },
        data: {
          processedArticles: processed,
          progress,
          llmCalls,
          estimatedCostUsd: parseFloat((llmCalls * COST_PER_LLM_CALL_USD).toFixed(4)),
        },
      });

      await job.updateProgress(progress);
    }

    await this.prisma.regenerationRun.update({
      where: { id: runId },
      data: { status: 'COMPLETED', completedAt: new Date(), progress: 100 },
    });
  }
}
