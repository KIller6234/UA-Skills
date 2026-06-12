import { Module } from '@nestjs/common';
import { DigestsService } from './digests.service';
import { DigestsController } from './digests.controller';
import { DatabaseModule } from '@nih/database';
import { QueuesModule } from '@nih/queues';

@Module({
  imports: [DatabaseModule, QueuesModule],
  controllers: [DigestsController],
  providers: [DigestsService],
})
export class DigestsModule {}
