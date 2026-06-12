import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import { PrismaService } from '@nih/database';
import { type Env } from '@nih/config';
import { QUEUE_NAMES, type ArticleProcessJobDto, buildRedisConnection } from '@nih/queues';
import { LlmServiceImpl } from '@nih/llm';
import { ArticlePreFilter } from '@nih/common';
import { EntityDedupService } from '@nih/ner';

@Injectable()
export class ArticleProcessProcessor implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ArticleProcessProcessor.name);
  private worker!: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly llm: LlmServiceImpl,
    private readonly preFilter: ArticlePreFilter,
    private readonly entityDedup: EntityDedupService,
  ) {}

  onApplicationBootstrap(): void {
    const connection = buildRedisConnection(this.config.get('REDIS_URL', { infer: true }));

    this.worker = new Worker<ArticleProcessJobDto>(
      QUEUE_NAMES.ARTICLE_PROCESS,
      (job) => this.process(job),
      {
        connection,
        concurrency: this.config.get('LLM_CONCURRENCY', { infer: true }),
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error({ event: 'article_job_failed', jobId: job?.id, error: err.message });
    });

    this.logger.log('Article process processor started');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<ArticleProcessJobDto>): Promise<void> {
    const { articleId, userId } = job.data;

    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return;

    if (article.status !== 'FETCHED') return;

    const filterResult = this.preFilter.filter(article);
    if (!filterResult.pass) {
      await this.prisma.article.update({
        where: { id: articleId },
        data: { status: 'FILTERED', metadata: { filterReason: filterResult.reason } },
      });
      this.logger.log({ event: 'article_filtered', articleId, reason: filterResult.reason });
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        categories: { select: { name: true } },
        axes: {
          select: {
            key: true,
            label: true,
            values: { select: { value: true, label: true } },
          },
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
    const promptVersion = this.config.get('LLM_PROMPT_VERSION', { infer: true });
    const maxChars = this.config.get('LLM_MAX_INPUT_TOKENS', { infer: true }) * 4;

    let analysis;
    try {
      analysis = await this.llm.analyzeArticle({
        contentHash: article.contentHash,
        title: article.title,
        bodyText: article.bodyText.slice(0, maxChars),
        userCategories,
        axes,
        promptVersion,
      });
    } catch (err) {
      await this.prisma.article.update({
        where: { id: articleId },
        data: { status: 'FAILED' },
      });
      this.logger.error({ event: 'article_llm_failed', articleId, error: String(err) });
      throw err;
    }

    const entities = await this.entityDedup.findOrCreate(analysis.entities);

    const allCategories = await this.prisma.userCategory.findMany({
      where: { userId, name: { in: analysis.categories } },
      select: { id: true },
    });
    const categoryIds = allCategories.map((c) => c.id);

    const importanceMap = { high: 80, normal: 50, junk: 10 } as const;
    const importance = importanceMap[analysis.importance];

    await this.prisma.$transaction([
      this.prisma.articleClassification.upsert({
        where: { userId_articleId_promptVersion: { userId, articleId, promptVersion } },
        create: {
          userId,
          articleId,
          importance,
          summary: analysis.summary,
          axisValues: analysis.axisValues,
          categoryIds,
          keywords: analysis.entities.map((e) => e.name).slice(0, 10),
          model: 'google',
          promptVersion,
        },
        update: {
          importance,
          summary: analysis.summary,
          axisValues: analysis.axisValues,
          categoryIds,
        },
      }),
      ...entities.map((entity) =>
        this.prisma.articleEntity.upsert({
          where: { articleId_entityId: { articleId, entityId: entity.id } },
          create: { articleId, entityId: entity.id, mentionCount: 1 },
          update: { mentionCount: { increment: 1 } },
        }),
      ),
      this.prisma.article.update({
        where: { id: articleId },
        data: { status: 'CLASSIFIED' },
      }),
    ]);

    await this.prisma.entity.updateMany({
      where: { id: { in: entities.map((e) => e.id) } },
      data: { mentionCount: { increment: 1 } },
    });
    await this.entityDedup.updateCoMentions(entities.map((e) => e.id));

    this.logger.log({
      event: 'article_classified',
      articleId,
      userId,
      importance: analysis.importance,
      entities: entities.length,
    });
  }
}
