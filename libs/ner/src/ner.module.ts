import { Global, Module } from '@nestjs/common';
import { EntityDedupService } from './entity-dedup.service';

@Global()
@Module({
  providers: [EntityDedupService],
  exports: [EntityDedupService],
})
export class NerModule {}
