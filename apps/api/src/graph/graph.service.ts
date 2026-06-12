import { Injectable } from '@nestjs/common';
import { PrismaService } from '@nih/database';

type NodeType = 'all' | 'articles' | 'entities';

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  async buildGraph(userId: string, period = '7d', nodeTypes: NodeType = 'all', categoryId?: string) {
    const from = period !== 'all'
      ? new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)
      : undefined;

    const articleWhere = {
      feedArticles: {
        some: {
          userId,
          ...(from ? { firstSeenAt: { gte: from } } : {}),
        },
      },
      ...(categoryId
        ? { classifications: { some: { userId, categoryIds: { has: categoryId } } } }
        : {}),
    };

    const MAX_NODES = 200;

    const articles = nodeTypes !== 'entities'
      ? await this.prisma.article.findMany({
          where: { ...articleWhere, status: 'CLASSIFIED' },
          take: MAX_NODES,
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            publishedAt: true,
            classifications: {
              where: { userId },
              select: { importance: true },
              take: 1,
            },
          },
        })
      : [];

    const articleIds = articles.map((a) => a.id);

    const entityLinks = nodeTypes !== 'articles' && articleIds.length
      ? await this.prisma.articleEntity.findMany({
          where: { articleId: { in: articleIds } },
          select: {
            articleId: true,
            entity: { select: { id: true, canonicalName: true, kind: true } },
          },
        })
      : [];

    const entityIds = [...new Set(entityLinks.map((l) => l.entity.id))];

    const coMentions = entityIds.length
      ? await this.prisma.entityCoMention.findMany({
          where: {
            entityAId: { in: entityIds },
            entityBId: { in: entityIds },
          },
          select: { entityAId: true, entityBId: true, weight: true },
        })
      : [];

    const entityMap = new Map(entityLinks.map((l) => [l.entity.id, l.entity]));

    const nodes = [
      ...articles.map((a) => ({
        id: `a-${a.id}`,
        type: 'article' as const,
        label: a.title.slice(0, 50),
        importance: mapImportance(a.classifications[0]?.importance ?? 50),
        ts: a.publishedAt?.toISOString() ?? '',
        data: { articleId: a.id },
      })),
      ...[...entityMap.values()].map((e) => ({
        id: `e-${e.id}`,
        type: 'entity' as const,
        label: e.canonicalName,
        entityType: e.kind,
        data: { entityId: e.id },
      })),
    ];

    const edges = [
      ...entityLinks.map((l, i) => ({
        id: `me-${i}`,
        source: `a-${l.articleId}`,
        target: `e-${l.entity.id}`,
        type: 'mentions' as const,
      })),
      ...coMentions.map((c, i) => ({
        id: `co-${i}`,
        source: `e-${c.entityAId}`,
        target: `e-${c.entityBId}`,
        type: 'co_mention' as const,
        weight: c.weight,
      })),
    ];

    const trimmed = nodes.length > MAX_NODES;

    return { nodes: nodes.slice(0, MAX_NODES), edges, trimmed, totalNodes: nodes.length };
  }
}

function mapImportance(value: number): 'high' | 'normal' | 'junk' {
  if (value >= 70) {return 'high';}
  if (value >= 30) {return 'normal';}
  return 'junk';
}
