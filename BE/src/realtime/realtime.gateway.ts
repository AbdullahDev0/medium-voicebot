/**
 * @file realtime.gateway.ts
 * @description Websocket gateway for realtime voice sessions.
 * @module realtime/gateway
 *
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketServer } from 'ws';
import { REALTIME } from '../constants';
import { RealtimeService } from './realtime.service';

@Injectable()
export class RealtimeGateway implements OnModuleInit, OnModuleDestroy {
  private server: WebSocketServer | null = null;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly realtimeService: RealtimeService,
  ) {}

  onModuleInit() {
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();
    this.server = new WebSocketServer({
      server: httpServer,
      path: REALTIME.WS_PATH,
    });
    this.server.on('connection', (socket) => {
      this.realtimeService.handleClientConnection(socket);
    });
  }

  onModuleDestroy() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
