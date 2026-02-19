/**
 * @file llm.module.ts
 * @description LLM module.
 * @module llm/module
 *
 */

import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';

@Module({
  controllers: [LlmController],
  providers: [LlmService],
})
export class LlmModule {}
