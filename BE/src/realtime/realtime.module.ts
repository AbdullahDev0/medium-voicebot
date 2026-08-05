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
import { WebrtcController } from './webrtc/webrtc.controller';
import { WebrtcService } from './webrtc/webrtc.service';
import { WebrtcSessionService } from './webrtc/webrtc-session.service';

@Module({
  imports: [ToolsModule],
  controllers: [WebrtcController],
  providers: [RealtimeGateway, RealtimeService, WebrtcService, WebrtcSessionService],
})
export class RealtimeModule {}
