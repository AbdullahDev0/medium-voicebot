/**
 * @file realtime.gateway.ts
 * @description Websocket gateway for realtime voice sessions.
 * @module realtime/gateway
 *
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketServer } from 'ws';
import { LOGS, REALTIME } from '../constants';
import { config } from '../config';
import { RealtimeService } from './realtime.service';

@Injectable()
export class RealtimeGateway implements OnModuleInit, OnModuleDestroy {
  private generalServer: WebSocketServer | null = null;
  private propertiesServer: WebSocketServer | null = null;
  private upgradeHandler:
    | ((request: IncomingMessage, socket: Socket, head: Buffer) => void)
    | null = null;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly realtimeService: RealtimeService,
  ) {}

  private logDebug(message: string) {
    if (config.logging.agentDebug) {
      this.logger.log(message);
    }
  }

  onModuleInit() {
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();
    const generalServer = new WebSocketServer({ noServer: true });
    generalServer.on('connection', (socket) => {
      this.logDebug(`${LOGS.REALTIME_CLIENT_ROUTE}${REALTIME.WS_PATH}`);
      this.realtimeService.handleClientConnection(socket, false);
    });
    const propertiesServer = new WebSocketServer({ noServer: true });
    propertiesServer.on('connection', (socket) => {
      this.logDebug(`${LOGS.REALTIME_CLIENT_ROUTE}${REALTIME.PROPERTIES_WS_PATH}`);
      this.realtimeService.handleClientConnection(socket, true);
    });
    this.generalServer = generalServer;
    this.propertiesServer = propertiesServer;
    this.upgradeHandler = (request, socket, head) => {
      const rawUrl = request.url ?? '';
      const path = rawUrl.split('?')[0];
      this.logDebug(`${LOGS.REALTIME_UPGRADE}${path}`);
      if (path === REALTIME.WS_PATH) {
        generalServer.handleUpgrade(request, socket, head, (ws) => {
          generalServer.emit('connection', ws, request);
        });
        return;
      }
      if (path === REALTIME.PROPERTIES_WS_PATH) {
        propertiesServer.handleUpgrade(request, socket, head, (ws) => {
          propertiesServer.emit('connection', ws, request);
        });
        return;
      }
      this.logDebug(`${LOGS.REALTIME_UPGRADE_UNHANDLED}${path}`);
      socket.destroy();
    };
    httpServer.on('upgrade', this.upgradeHandler);
    this.logDebug(`${LOGS.REALTIME_WS_SERVER_READY}${REALTIME.WS_PATH}`);
    this.logDebug(
      `${LOGS.REALTIME_PROPERTIES_WS_SERVER_READY}${REALTIME.PROPERTIES_WS_PATH}`,
    );
  }

  onModuleDestroy() {
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();
    if (this.upgradeHandler) {
      httpServer.off('upgrade', this.upgradeHandler);
      this.upgradeHandler = null;
    }
    if (this.generalServer) {
      this.generalServer.close();
      this.generalServer = null;
    }
    if (this.propertiesServer) {
      this.propertiesServer.close();
      this.propertiesServer = null;
    }
  }
}
