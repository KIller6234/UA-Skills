import { Module } from '@nestjs/common';
import { RegenerationService } from './regeneration.service';
import { RegenerationController } from './regeneration.controller';
import { DatabaseModule } from '@nih/database';
import { QueuesModule } from '@nih/queues';

@Module({
  imports: [DatabaseModule, QueuesModule],
  controllers: [RegenerationController],
  providers: [RegenerationService],
})
export class RegenerationModule {}
