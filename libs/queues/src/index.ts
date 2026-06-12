export const QUEUE_NAMES = {
  FEED_POLL: 'feed-poll',
  ARTICLE_PROCESS: 'article-process',
  ARTICLE_REGENERATE: 'article-regenerate',
  DIGEST_BUILD: 'digest-build',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export { QueuesService, buildRedisConnection } from './queues.service';
export { QueuesModule } from './queues.module';
export type { FeedPollJobDto } from './dto/feed-poll.dto';
export type { ArticleProcessJobDto } from './dto/article-process.dto';
export type { DigestBuildJobDto } from './dto/digest-build.dto';
export type { RegenerateJobDto } from './dto/regenerate.dto';
