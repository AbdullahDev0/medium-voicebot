/**
 * @file app.module.ts
 * @description Root module for the Voicebot Console backend.
 * @module app/module
 *
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { LlmModule } from './llm/llm.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [HealthModule, LlmModule, RealtimeModule],
})
export class AppModule {}
