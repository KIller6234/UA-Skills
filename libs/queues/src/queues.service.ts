import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { type Env } from '@nih/config';
import { QUEUE_NAMES, type QueueName } from './index';
import { type FeedPollJobDto } from './dto/feed-poll.dto';
import { type ArticleProcessJobDto } from './dto/article-process.dto';
import { type DigestBuildJobDto } from './dto/digest-build.dto';
import { type RegenerateJobDto } from './dto/regenerate.dto';

export function buildRedisConnection(redisUrl: string) {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null as null,
    enableOfflineQueue: true,
    retryStrategy: (times: number) => Math.min(times * 500, 5000),
  };
}

@Injectable()
export class QueuesService implements OnApplicationShutdown {
  private readonly queueMap = new Map<QueueName, Queue>();

  constructor(config: ConfigService<Env, true>) {
    const connection = buildRedisConnection(config.get('REDIS_URL', { infer: true }));
    for (const name of Object.values(QUEUE_NAMES)) {
      this.queueMap.set(name, new Queue(name, { connection }));
    }
  }

  async addFeedPollJob(data: FeedPollJobDto): Promise<void> {
    await this.queueMap.get(QUEUE_NAMES.FEED_POLL)!.add('poll', data, {
      jobId: `feed-poll-${data.feedId}`,
      removeOnComplete: { count: 0 },
      removeOnFail: { count: 10 },
    });
  }

  async addArticleProcessJob(data: ArticleProcessJobDto): Promise<void> {
    await this.queueMap.get(QUEUE_NAMES.ARTICLE_PROCESS)!.add('process', data, {
      removeOnComplete: 200,
      removeOnFail: 100,
    });
  }

  async addDigestBuildJob(data: DigestBuildJobDto): Promise<void> {
    await this.queueMap.get(QUEUE_NAMES.DIGEST_BUILD)!.add('build', data, {
      jobId: `digest-${data.userId}-${data.period}-${new Date().toISOString().slice(0, 10)}`,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    });
  }

  async addRegenerateJob(data: RegenerateJobDto): Promise<void> {
    await this.queueMap.get(QUEUE_NAMES.ARTICLE_REGENERATE)!.add('regenerate', data, {
      jobId: `regen-${data.runId}`,
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 5 },
    });
  }

  async getRegenerateJob(runId: string) {
    const queue = this.queueMap.get(QUEUE_NAMES.ARTICLE_REGENERATE)!;
    return queue.getJob(`regen-${runId}`);
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([...this.queueMap.values()].map((q) => q.close()));
  }
}
