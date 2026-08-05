/**
 * @file webrtc-session.service.ts
 * @description WebRTC session registry for signaling.
 * @module realtime/webrtc-session
 *
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DEFAULTS, LOGS } from '../../constants';

export type WebrtcSession = {
  id: string;
  usePropertyTools: boolean;
  createdAt: number;
  expiresAt: number;
};

@Injectable()
export class WebrtcSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(WebrtcSessionService.name);
  private readonly sessions = new Map<string, WebrtcSession>();
  private readonly sweepInterval: NodeJS.Timeout;

  constructor() {
    this.sweepInterval = setInterval(() => this.sweepExpired(), 60_000);
  }

  createSession(usePropertyTools: boolean) {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    const now = Date.now();
    const session: WebrtcSession = {
      id,
      usePropertyTools,
      createdAt: now,
      expiresAt: now + DEFAULTS.WEBRTC_SESSION_TTL_MS,
    };
    this.sessions.set(id, session);
    this.logger.log(`${LOGS.WEBRTC_SESSION_CREATED}${id}`);
    return session;
  }

  getSession(id: string) {
    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(id);
      this.logger.log(`${LOGS.WEBRTC_SESSION_EXPIRED}${id}`);
      return null;
    }
    return session;
  }

  private sweepExpired() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
        this.logger.log(`${LOGS.WEBRTC_SESSION_EXPIRED}${id}`);
      }
    }
  }

  onModuleDestroy() {
    clearInterval(this.sweepInterval);
    this.sessions.clear();
  }
}
