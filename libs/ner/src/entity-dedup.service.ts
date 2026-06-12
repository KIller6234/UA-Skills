import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@nih/database';
import { LlmServiceImpl } from '@nih/llm';
import type { ExtractedEntity } from '@nih/llm';
import type { Entity } from '@prisma/client';

@Injectable()
export class EntityDedupService {
  private readonly logger = new Logger(EntityDedupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmServiceImpl,
  ) {}

  async findOrCreate(extracted: ExtractedEntity[]): Promise<Entity[]> {
    return Promise.all(extracted.map((e) => this.resolve(e)));
  }

  private normalize(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async addAlias(entity: Entity, alias: string): Promise<Entity> {
    if (entity.aliases.includes(alias)) return entity;
    return this.prisma.entity.update({
      where: { id: entity.id },
      data: { aliases: { push: alias } },
    });
  }

  private async resolve(e: ExtractedEntity): Promise<Entity> {
    const normalized = this.normalize(e.name);
    const kind = e.type.toUpperCase() as Entity['kind'];

    // Tier 1: exact normalized name match
    const exact = await this.prisma.entity.findFirst({
      where: { normalizedName: normalized },
    });
    if (exact) return this.addAlias(exact, e.name);

    // Tier 2: aliases array contains this name
    const aliasMatch = await this.prisma.entity.findFirst({
      where: { aliases: { has: e.name } },
    });
    if (aliasMatch) return aliasMatch;

    // Tier 3: pg_trgm similarity > 0.85
    const candidates = await this.prisma.$queryRaw<Entity[]>`
      SELECT * FROM "Entity"
      WHERE kind = ${kind}::"EntityKind"
      AND similarity("normalizedName", ${normalized}) > 0.85
      LIMIT 5
    `;

    if (candidates.length === 1) return this.addAlias(candidates[0]!, e.name);

    if (candidates.length > 1) {
      try {
        const match = await this.llm.matchEntities({
          candidate: e.name,
          options: candidates.map((c) => c.canonicalName),
        });
        if (match.matchedName) {
          const found = candidates.find((c) => c.canonicalName === match.matchedName);
          if (found) return this.addAlias(found, e.name);
        }
      } catch (err) {
        this.logger.warn({ event: 'entity_match_llm_failed', name: e.name, error: String(err) });
      }
    }

    // No match — create new entity
    return this.prisma.entity.create({
      data: {
        kind,
        canonicalName: e.name,
        normalizedName: normalized,
        aliases: [e.name],
      },
    });
  }

  async updateCoMentions(entityIds: string[]): Promise<void> {
    if (entityIds.length < 2) return;

    for (let i = 0; i < entityIds.length; i++) {
      for (let j = i + 1; j < entityIds.length; j++) {
        const aId = entityIds[i]!;
        const bId = entityIds[j]!;
        const [entityAId, entityBId] = aId < bId ? [aId, bId] : [bId, aId];

        await this.prisma.entityCoMention.upsert({
          where: { entityAId_entityBId: { entityAId, entityBId } },
          create: { entityAId, entityBId, coCount: 1, weight: 1.0 },
          update: {
            coCount: { increment: 1 },
            weight: { increment: 0.1 },
            lastSeenAt: new Date(),
          },
        });
      }
    }
  }
}
