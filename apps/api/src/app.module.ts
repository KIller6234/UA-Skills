import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { DatabaseModule } from '@nih/database';
import { AppConfigModule } from '@nih/config';
import { QueuesModule } from '@nih/queues';
import { LlmModule } from '@nih/llm';

import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { FeedsModule } from './feeds/feeds.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CategoriesModule } from './categories/categories.module';
import { AxesModule } from './axes/axes.module';
import { ArticlesModule } from './articles/articles.module';
import { GraphModule } from './graph/graph.module';
import { DigestsModule } from './digests/digests.module';
import { RegenerationModule } from './regeneration/regeneration.module';
import { EntitiesModule } from './entities/entities.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    DatabaseModule,
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60_000, limit: 20 },
      { name: 'long',  ttl: 600_000, limit: 200 },
    ]),
    HealthModule,
    AuthModule,
    FeedsModule,
    QueuesModule,
    LlmModule,
    DashboardModule,
    CategoriesModule,
    AxesModule,
    ArticlesModule,
    GraphModule,
    DigestsModule,
    RegenerationModule,
    EntitiesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
