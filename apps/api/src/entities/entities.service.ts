import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@nih/database';

@Injectable()
export class EntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string, id: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      select: {
        id: true,
        canonicalName: true,
        kind: true,
        aliases: true,
        mentionCount: true,
        _count: { select: { articles: true } },
      },
    });
    if (!entity) {throw new NotFoundException('Entity not found');}

    const userArticleCount = await this.prisma.articleEntity.count({
      where: { entityId: id, article: { feedArticles: { some: { userId } } } },
    });

    return { ...entity, userArticleCount };
  }

  async findArticles(userId: string, entityId: string, page = 1, limit = 20) {
    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) {throw new NotFoundException('Entity not found');}

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.articleEntity.findMany({
        where: { entityId, article: { feedArticles: { some: { userId } } } },
        orderBy: { mentionCount: 'desc' },
        skip,
        take: limit,
        select: {
          mentionCount: true,
          article: {
            select: {
              id: true,
              title: true,
              sourceDomain: true,
              publishedAt: true,
              classifications: {
                where: { userId },
                select: { importance: true },
                take: 1,
              },
              feedArticles: {
                where: { userId },
                take: 1,
                select: { feed: { select: { title: true } } },
              },
            },
          },
        },
      }),
      this.prisma.articleEntity.count({
        where: { entityId, article: { feedArticles: { some: { userId } } } },
      }),
    ]);

    return {
      items: items.map((ae) => ({
        id: ae.article.id,
        title: ae.article.title,
        sourceDomain: ae.article.sourceDomain,
        publishedAt: ae.article.publishedAt,
        importance: ae.article.classifications[0]?.importance ?? null,
        feedTitle: ae.article.feedArticles[0]?.feed.title ?? null,
        mentionCount: ae.mentionCount,
      })),
      total,
      page,
      limit,
    };
  }
}
