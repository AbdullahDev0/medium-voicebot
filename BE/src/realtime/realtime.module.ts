/**
 * @file realtime.module.ts
 * @description Realtime websocket module for Voicebot Console.
 * @module realtime/module
 *
 */

import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [ToolsModule],
  providers: [RealtimeGateway, RealtimeService],
})
export class RealtimeModule {}
