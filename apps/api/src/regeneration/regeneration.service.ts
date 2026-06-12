import { Injectable } from '@nestjs/common';
import { PrismaService } from '@nih/database';
import { QueuesService } from '@nih/queues';
import { randomBytes } from 'crypto';

@Injectable()
export class RegenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
  ) {}

  async start(userId: string) {
    const active = await this.prisma.regenerationRun.findFirst({
      where: { userId, status: 'RUNNING' },
    });
    if (active) {return { runId: active.id, status: 'already_running' };}

    const run = await this.prisma.regenerationRun.create({
      data: { userId, id: randomBytes(12).toString('hex') },
    });

    await this.queues.addRegenerateJob({ userId, runId: run.id });
    return { runId: run.id, status: 'started' };
  }

  async getStatus(userId: string) {
    const run = await this.prisma.regenerationRun.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });

    if (!run) {return { status: 'idle' };}

    return {
      runId: run.id,
      status: run.status.toLowerCase(),
      progress: run.progress,
      processedArticles: run.processedArticles,
      totalArticles: run.totalArticles,
      llmCalls: run.llmCalls,
      estimatedCostUsd: run.estimatedCostUsd,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
  }

  async getHistory(userId: string) {
    const runs = await this.prisma.regenerationRun.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        progress: true,
        processedArticles: true,
        totalArticles: true,
        llmCalls: true,
        estimatedCostUsd: true,
        startedAt: true,
        completedAt: true,
      },
    });

    return runs.map((r) => ({ ...r, status: r.status.toLowerCase() }));
  }

  async pause(userId: string) {
    const run = await this.prisma.regenerationRun.findFirst({
      where: { userId, status: 'RUNNING' },
    });
    if (!run) {return { status: 'no_active_run' };}

    await this.prisma.regenerationRun.update({
      where: { id: run.id },
      data: { status: 'PAUSED' },
    });
    return { runId: run.id, status: 'paused' };
  }
}
