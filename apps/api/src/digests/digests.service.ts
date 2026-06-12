/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@nih/database';
import { QueuesService } from '@nih/queues';
import { DigestPeriod } from '@prisma/client';

@Injectable()
export class DigestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
  ) {}

  async findAll(userId: string, period?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = {
      userId,
      ...(period ? { period: period.toUpperCase() as DigestPeriod } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.digest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          period: true,
          periodStart: true,
          periodEnd: true,
          title: true,
          summary: true,
          articleCount: true,
          createdAt: true,
          items: {
            take: 3,
            orderBy: { rank: 'asc' },
            select: {
              article: {
                select: {
                  classifications: {
                    select: { categoryIds: true },
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.digest.count({ where }),
    ]);

    return {
      items: items.map((d) => ({
        id: d.id,
        period: d.period.toLowerCase(),
        periodStart: d.periodStart,
        periodEnd: d.periodEnd,
        title: d.title,
        summary: d.summary,
        articleCount: d.articleCount,
        createdAt: d.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(userId: string, id: string) {
    const digest = await this.prisma.digest.findFirst({
      where: { id, userId },
      include: {
        items: {
          orderBy: { rank: 'asc' },
          include: {
            article: {
              select: {
                id: true,
                title: true,
                sourceDomain: true,
                publishedAt: true,
                classifications: {
                  where: { userId },
                  select: { importance: true, summary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    if (!digest) {throw new NotFoundException('Digest not found');}

    return {
      id: digest.id,
      period: digest.period.toLowerCase(),
      periodStart: digest.periodStart,
      periodEnd: digest.periodEnd,
      title: digest.title,
      summary: digest.summary,
      bodyMarkdown: digest.bodyMarkdown,
      articleCount: digest.articleCount,
      createdAt: digest.createdAt,
      items: digest.items.map((item) => ({
        rank: item.rank,
        reason: item.reason,
        article: {
          id: item.article.id,
          title: item.article.title,
          sourceDomain: item.article.sourceDomain,
          publishedAt: item.article.publishedAt,
          importance: item.article.classifications[0]?.importance ?? null,
          summary: item.article.classifications[0]?.summary ?? null,
        },
      })),
    };
  }

  async trigger(userId: string, period: string) {
    const p = period.toUpperCase() as DigestPeriod;
    await this.queues.addDigestBuildJob({ userId, period: p });
    return { queued: true, period: p.toLowerCase() };
  }

  async remove(userId: string, id: string) {
    const digest = await this.prisma.digest.findFirst({ where: { id, userId } });
    if (!digest) {throw new NotFoundException('Digest not found');}
    await this.prisma.digest.delete({ where: { id } });
  }

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { digestHour: true, digestEmailEnabled: true, timezone: true },
    });
    if (!user) {throw new NotFoundException('User not found');}
    return { digestHour: user.digestHour, digestEmailEnabled: user.digestEmailEnabled, timezone: user.timezone };
  }

  async updateSettings(userId: string, dto: { digestHour?: number; digestEmailEnabled?: boolean }) {
    const data: { digestHour?: number; digestEmailEnabled?: boolean } = {};
    if (dto.digestHour !== undefined) {
      data.digestHour = Math.max(0, Math.min(23, Math.round(dto.digestHour)));
    }
    if (dto.digestEmailEnabled !== undefined) {
      data.digestEmailEnabled = dto.digestEmailEnabled;
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { digestHour: true, digestEmailEnabled: true, timezone: true },
    });
    return { digestHour: user.digestHour, digestEmailEnabled: user.digestEmailEnabled, timezone: user.timezone };
  }
}
