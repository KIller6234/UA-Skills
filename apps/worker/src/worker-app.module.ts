import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { DatabaseModule } from '@nih/database';
import { AppConfigModule } from '@nih/config';
import { QueuesModule } from '@nih/queues';
import { LlmModule } from '@nih/llm';
import { NerModule } from '@nih/ner';
import { ArticlePreFilter } from '@nih/common';

import { FeedPollProcessor } from './processors/feed-poll.processor';
import { ArticleProcessProcessor } from './processors/article-process.processor';
import { DigestProcessor } from './processors/digest.processor';
import { RegenerateProcessor } from './processors/regenerate.processor';
import { FeedSchedulerService } from './schedulers/feed-scheduler.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    DatabaseModule,
    QueuesModule,
    LlmModule,
    NerModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    ArticlePreFilter,
    FeedPollProcessor,
    ArticleProcessProcessor,
    DigestProcessor,
    RegenerateProcessor,
    FeedSchedulerService,
  ],
})
export class WorkerAppModule {}
