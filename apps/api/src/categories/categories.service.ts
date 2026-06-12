import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@nih/database';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const categories = await this.prisma.userCategory.findMany({
      where: { userId, isArchived: false },
      orderBy: { sortOrder: 'asc' },
    });

    const counts = await this.prisma.$queryRaw<{ id: string; count: bigint }[]>`
      SELECT uc.id, COUNT(DISTINCT ac."articleId") as count
      FROM "UserCategory" uc
      LEFT JOIN "ArticleClassification" ac
        ON uc.id = ANY(ac."categoryIds") AND ac."userId" = ${userId}
      WHERE uc."userId" = ${userId}
      GROUP BY uc.id
    `;
    const countMap = Object.fromEntries(counts.map((r) => [r.id, Number(r.count)]));

    return categories.map((c) => ({ ...c, articleCount: countMap[c.id] ?? 0 }));
  }

  async create(userId: string, dto: { name: string; color?: string }) {
    const slug = dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const count = await this.prisma.userCategory.count({ where: { userId } });
    return this.prisma.userCategory.create({
      data: { userId, name: dto.name, slug: `${slug}-${Date.now()}`, color: dto.color, sortOrder: count },
    });
  }

  async update(userId: string, id: string, dto: { name?: string; color?: string }) {
    await this.assertOwner(userId, id);
    return this.prisma.userCategory.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.userCategory.update({ where: { id }, data: { isArchived: true } });
  }

  private async assertOwner(userId: string, id: string) {
    const cat = await this.prisma.userCategory.findFirst({ where: { id, userId } });
    if (!cat) {throw new NotFoundException('Category not found');}
  }
}
