import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import { createHash } from 'crypto';
import Parser from 'rss-parser';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@nih/database';
import { type Env } from '@nih/config';
import { QUEUE_NAMES, type FeedPollJobDto, QueuesService, buildRedisConnection } from '@nih/queues';
import { assertPublicUrl, htmlToText } from '@nih/feed';

const rssParser = new Parser({ timeout: 10_000 });

function sanitizeText(raw: string): string {
  return raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

@Injectable()
export class FeedPollProcessor implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(FeedPollProcessor.name);
  private worker!: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly queues: QueuesService,
  ) {}

  onApplicationBootstrap(): void {
    const connection = buildRedisConnection(this.config.get('REDIS_URL', { infer: true }));
    const concurrency = this.config.get('FEED_MAX_CONCURRENT_POLLS', { infer: true });

    this.worker = new Worker<FeedPollJobDto>(
      QUEUE_NAMES.FEED_POLL,
      (job) => this.process(job),
      {
        connection,
        concurrency,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error({ event: 'job_failed', jobId: job?.id, error: err.message });
    });

    this.logger.log('Feed poll processor started');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<FeedPollJobDto>): Promise<void> {
    const { feedId } = job.data;

    const feed = await this.prisma.feed.findUnique({ where: { id: feedId } });
    if (!feed || feed.status === 'PAUSED') return;

    const maxFailures = this.config.get('FEED_MAX_FAILURES_BEFORE_ERROR', { infer: true });
    const timeoutMs = this.config.get('FEED_FETCH_TIMEOUT_MS', { infer: true });

    try {
      await assertPublicUrl(feed.canonicalUrl);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let res: Response;
      try {
        res = await fetch(feed.canonicalUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'NIH-Bot/1.0',
            ...(feed.etag ? { 'If-None-Match': feed.etag } : {}),
            ...(feed.lastModified ? { 'If-Modified-Since': feed.lastModified } : {}),
          },
        });
      } finally {
        clearTimeout(timer);
      }

      if (res.status === 304) {
        await this.markSuccess(feedId, feed.pollIntervalSeconds);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status} from ${feed.canonicalUrl}`);

      const xml = await res.text();
      const newEtag = res.headers.get('etag');
      const newLastModified = res.headers.get('last-modified');

      const parsed = await rssParser.parseString(xml);
      let linked = 0;

      for (const item of parsed.items) {
        if (!item.link) continue;

        const rawBody = (item as Record<string, unknown>)['content:encoded'] as string | undefined
          ?? item.content
          ?? item.contentSnippet
          ?? '';
        const bodyText = htmlToText(rawBody);
        const title = sanitizeText(item.title ?? 'Untitled');
        const contentHash = createHash('sha256')
          .update(item.link + bodyText)
          .digest('hex');
        const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

        try {
          const article = await this.prisma.article.upsert({
            where: { canonicalUrl: item.link },
            create: {
              canonicalUrl: item.link,
              contentHash,
              title,
              bodyText,
              excerpt: bodyText.slice(0, 300) || null,
              sourceDomain: new URL(item.link).hostname,
              wordCount,
              publishedAt: item.pubDate ? new Date(item.pubDate) : null,
            },
            update: {},
            select: { id: true, status: true },
          });

          await this.prisma.feedArticle.upsert({
            where: { feedId_articleId: { feedId, articleId: article.id } },
            create: { feedId, articleId: article.id, userId: feed.userId },
            update: {},
          });

          if (article.status === 'FETCHED') {
            await this.queues.addArticleProcessJob({ articleId: article.id, userId: feed.userId });
          }

          linked++;
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            continue;
          }
          this.logger.warn({ event: 'article_skip', url: item.link, error: String(e) });
        }
      }

      await this.prisma.feed.update({
        where: { id: feedId },
        data: {
          status: 'ACTIVE',
          consecutiveFailures: 0,
          lastError: null,
          lastErrorAt: null,
          lastPolledAt: new Date(),
          nextPollAt: new Date(Date.now() + feed.pollIntervalSeconds * 1000),
          ...(newEtag !== null ? { etag: newEtag } : {}),
          ...(newLastModified !== null ? { lastModified: newLastModified } : {}),
          ...(parsed.title ? { title: parsed.title } : {}),
        },
      });

      this.logger.log({
        event: 'feed_polled',
        feedId,
        total: parsed.items.length,
        linked,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const failures = feed.consecutiveFailures + 1;

      await this.prisma.feed.update({
        where: { id: feedId },
        data: {
          consecutiveFailures: failures,
          lastError: msg,
          lastErrorAt: new Date(),
          status: failures >= maxFailures ? 'ERROR' : feed.status,
          nextPollAt: new Date(Date.now() + feed.pollIntervalSeconds * 1000),
        },
      });

      this.logger.error({
        event: 'feed_poll_failed',
        feedId,
        error: msg,
        consecutiveFailures: failures,
      });

      throw err;
    }
  }

  private async markSuccess(feedId: string, pollInterval: number): Promise<void> {
    await this.prisma.feed.update({
      where: { id: feedId },
      data: {
        status: 'ACTIVE',
        consecutiveFailures: 0,
        lastError: null,
        lastPolledAt: new Date(),
        nextPollAt: new Date(Date.now() + pollInterval * 1000),
      },
    });
  }
}
