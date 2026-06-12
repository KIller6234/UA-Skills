import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@nih/database';

@Injectable()
export class AxesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.categorizationAxis.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      include: { values: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async create(userId: string, dto: { key: string; label: string; description?: string }) {
    const count = await this.prisma.categorizationAxis.count({ where: { userId } });
    return this.prisma.categorizationAxis.create({
      data: { userId, key: dto.key, label: dto.label, description: dto.description, sortOrder: count },
      include: { values: true },
    });
  }

  async update(userId: string, id: string, dto: { label?: string; description?: string }) {
    await this.assertOwner(userId, id);
    return this.prisma.categorizationAxis.update({
      where: { id },
      data: dto,
      include: { values: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.categorizationAxis.delete({ where: { id } });
  }

  async addValue(userId: string, axisId: string, dto: { value: string; label: string }) {
    await this.assertOwner(userId, axisId);
    const count = await this.prisma.axisValue.count({ where: { axisId } });
    return this.prisma.axisValue.create({
      data: { axisId, value: dto.value, label: dto.label, sortOrder: count },
    });
  }

  async removeValue(userId: string, axisId: string, valueId: string) {
    await this.assertOwner(userId, axisId);
    await this.prisma.axisValue.delete({ where: { id: valueId } });
  }

  private async assertOwner(userId: string, id: string) {
    const axis = await this.prisma.categorizationAxis.findFirst({ where: { id, userId } });
    if (!axis) {throw new NotFoundException('Axis not found');}
  }
}
