/**
 * @file webrtc.controller.ts
 * @description WebRTC session setup endpoints.
 * @module realtime/webrtc-controller
 *
 */

import { Body, Controller, Post, Req, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { API, ERRORS, WEBRTC } from '../../constants';
import { config } from '../../config';
import { WebrtcSessionService } from './webrtc-session.service';

const resolveWsProtocol = (request: Request) => {
  const forwarded = request.headers[WEBRTC.ICE_SERVERS_HEADER];
  const protoHeader = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const rawProtocol = protoHeader || request.protocol || 'http';
  return rawProtocol.includes('https') ? 'wss' : 'ws';
};

const resolveHost = (request: Request) => {
  const forwardedHost = request.headers['x-forwarded-host'];
  if (typeof forwardedHost === 'string' && forwardedHost) {
    return forwardedHost;
  }
  if (Array.isArray(forwardedHost) && forwardedHost[0]) {
    return forwardedHost[0];
  }
  return request.headers.host ?? '';
};

@Controller(API.VOICE)
export class WebrtcController {
  constructor(private readonly sessionService: WebrtcSessionService) {}

  @Post(API.SESSION)
  createSession(
    @Body() body: { usePropertyTools?: boolean },
    @Req() request: Request,
  ) {
    if (!config.realtime.enabled) {
      throw new BadRequestException(ERRORS.REALTIME_DISABLED);
    }
    const usePropertyTools = Boolean(body?.usePropertyTools);
    const session = this.sessionService.createSession(usePropertyTools);
    const protocol = resolveWsProtocol(request);
    const host = resolveHost(request);
    if (!host) {
      throw new BadRequestException(ERRORS.REALTIME_SESSION_FAILED);
    }
    const url = new URL(WEBRTC.WS_PATH, `${protocol}://${host}`);
    url.searchParams.set('sessionId', session.id);
    return {
      sessionId: session.id,
      webrtcWsUrl: url.toString(),
      iceServers: config.webrtc.iceServers,
    };
  }
}
