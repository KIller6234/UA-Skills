import { Module } from '@nestjs/common';
import { FeedValidatorService } from './feed-validator.service';

@Module({
  providers: [FeedValidatorService],
  exports: [FeedValidatorService],
})
export class FeedLibModule {}
