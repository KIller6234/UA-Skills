import { Module } from '@nestjs/common';
import { FeedLibModule } from '@nih/feed';
import { FeedsService } from './feeds.service';
import { FeedsController } from './feeds.controller';

@Module({
  imports: [FeedLibModule],
  providers: [FeedsService],
  controllers: [FeedsController],
})
export class FeedsModule {}
