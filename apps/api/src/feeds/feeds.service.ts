import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@nih/database';
import { FeedValidatorService } from '@nih/feed';
import { QueuesService } from '@nih/queues';
import { CreateFeedDto } from './dto/create-feed.dto';

@Injectable()
export class FeedsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: FeedValidatorService,
    private readonly queues: QueuesService,
  ) {}

  async create(userId: string, dto: CreateFeedDto) {
    const preview = await this.validator.validateAndPreview(dto.url);

    const existing = await this.prisma.feed.findFirst({
      where: { userId, canonicalUrl: preview.canonicalUrl },
    });
    if (existing) {
      return existing;
    }

    const feed = await this.prisma.feed.create({
      data: {
        userId,
        url: dto.url,
        canonicalUrl: preview.canonicalUrl,
        title: preview.title,
        description: preview.description,
        siteUrl: preview.siteUrl,
      },
    });

    await this.queues.addFeedPollJob({ feedId: feed.id });

    return feed;
  }

  findAll(userId: string) {
    return this.prisma.feed.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        canonicalUrl: true,
        title: true,
        description: true,
        siteUrl: true,
        status: true,
        lastError: true,
        lastPolledAt: true,
        consecutiveFailures: true,
        createdAt: true,
      },
    });
  }

  async updateStatus(userId: string, feedId: string, status: 'ACTIVE' | 'PAUSED') {
    await this.assertOwnership(userId, feedId);
    return this.prisma.feed.update({
      where: { id: feedId },
      data: { status },
    });
  }

  async remove(userId: string, feedId: string) {
    await this.assertOwnership(userId, feedId);
    await this.prisma.feed.delete({ where: { id: feedId } });
  }

  async triggerPoll(userId: string, feedId: string) {
    await this.assertOwnership(userId, feedId);
    await this.queues.addFeedPollJob({ feedId });
    return { queued: true };
  }

  private async assertOwnership(userId: string, feedId: string) {
    const feed = await this.prisma.feed.findFirst({ where: { id: feedId, userId } });
    if (!feed) {throw new NotFoundException('Feed not found');}
    return feed;
  }
}
