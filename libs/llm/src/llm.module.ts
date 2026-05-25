import { Global, Module } from '@nestjs/common';
import { LlmServiceImpl } from './llm.service';

@Global()
@Module({
  providers: [LlmServiceImpl],
  exports: [LlmServiceImpl],
})
export class LlmModule {}
