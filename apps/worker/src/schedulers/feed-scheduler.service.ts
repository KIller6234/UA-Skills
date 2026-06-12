import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@nih/database';
import { QueuesService } from '@nih/queues';

@Injectable()
export class FeedSchedulerService {
  private readonly logger = new Logger(FeedSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleDueFeeds(): Promise<void> {
    const dueFeeds = await this.prisma.feed.findMany({
      where: {
        status: { in: ['PENDING', 'ACTIVE'] },
        nextPollAt: { lte: new Date() },
      },
      take: 50,
      select: { id: true },
    });

    for (const feed of dueFeeds) {
      await this.queues.addFeedPollJob({ feedId: feed.id });
    }

    if (dueFeeds.length > 0) {
      this.logger.log({ event: 'feeds_scheduled', count: dueFeeds.length });
    }
  }
}
