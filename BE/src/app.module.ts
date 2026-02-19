/**
 * @file app.module.ts
 * @description Root module for the Voicebot Console backend.
 * @module app/module
 *
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [HealthModule, LlmModule],
})
export class AppModule {}
