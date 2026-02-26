/**
 * @file realtime.service.ts
 * @description Realtime websocket relay service.
 * @module realtime/service
 *
 */

import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';
import {
  ERRORS,
  HTTP,
  LOGS,
  REALTIME,
  REALTIME_EVENTS,
  REALTIME_KEYS,
  REALTIME_RELAY,
} from '../constants';
import { config } from '../config';

type RealtimePayload = Record<string, unknown> & { type?: string };

const ALLOWED_CLIENT_EVENTS = new Set([
  REALTIME_EVENTS.INPUT_AUDIO_CLEAR,
  REALTIME_EVENTS.INPUT_AUDIO_APPEND,
  REALTIME_EVENTS.INPUT_AUDIO_COMMIT,
  REALTIME_EVENTS.RESPONSE_CREATE,
  REALTIME_EVENTS.RESPONSE_CANCEL,
  REALTIME_EVENTS.CONVERSATION_ITEM_TRUNCATE,
]);

const parsePayload = (data: WebSocket.RawData): RealtimePayload | null => {
  const text =
    typeof data === 'string'
      ? data
      : Buffer.isBuffer(data)
        ? data.toString('utf-8')
        : Array.isArray(data)
          ? Buffer.concat(data).toString('utf-8')
          : data.toString();
  if (!text) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as RealtimePayload;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const buildRelayError = (message: string, code?: string) => {
  const payload: Record<string, unknown> = {
    [REALTIME_KEYS.TYPE]: REALTIME_RELAY.ERROR,
    [REALTIME_RELAY.MESSAGE_KEY]: message,
  };
  if (code) {
    payload[REALTIME_RELAY.CODE_KEY] = code;
  }
  return payload;
};

const buildSessionUpdate = () => {
  const session: Record<string, unknown> = {
    [REALTIME_KEYS.TYPE]: REALTIME.SESSION_TYPE,
    [REALTIME_KEYS.INPUT_AUDIO_FORMAT]: REALTIME.INPUT_FORMAT_PCM16,
    [REALTIME_KEYS.OUTPUT_AUDIO_FORMAT]: REALTIME.OUTPUT_FORMAT_PCM16,
    [REALTIME_KEYS.OUTPUT_MODALITIES]: REALTIME.OUTPUT_MODALITIES_AUDIO,
    [REALTIME_KEYS.VOICE]: config.realtime.voice,
    [REALTIME_KEYS.TURN_DETECTION]: REALTIME.TURN_DETECTION_SERVER_VAD,
  };

  if (config.realtime.transcriptionModel) {
    session[REALTIME_KEYS.INPUT_AUDIO_TRANSCRIPTION] = {
      [REALTIME_KEYS.MODEL]: config.realtime.transcriptionModel,
    };
  }

  return {
    [REALTIME_KEYS.TYPE]: REALTIME_EVENTS.SESSION_UPDATE,
    [REALTIME_KEYS.SESSION]: session,
  };
};

const buildOpenAiUrl = () => {
  const url = new URL(config.realtime.url);
  url.searchParams.set(REALTIME.QUERY_MODEL_KEY, config.realtime.model);
  return url.toString();
};

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  handleClientConnection(client: WebSocket) {
    this.logger.log(LOGS.REALTIME_CLIENT_CONNECTED);
    if (!config.realtime.enabled) {
      this.logger.warn(LOGS.REALTIME_DISABLED);
      const payload = buildRelayError(ERRORS.REALTIME_DISABLED);
      client.send(JSON.stringify(payload));
      client.close();
      return;
    }

    if (!config.realtime.apiKey || !config.realtime.url || !config.realtime.model) {
      this.logger.warn(LOGS.REALTIME_MISSING_CONFIG);
      const payload = buildRelayError(ERRORS.REALTIME_SESSION_FAILED);
      client.send(JSON.stringify(payload));
      client.close();
      return;
    }

    const openAiSocket = new WebSocket(buildOpenAiUrl(), {
      headers: {
        [HTTP.HEADER_AUTH]: `${HTTP.BEARER_PREFIX}${config.realtime.apiKey}`,
      },
    });

    const pendingMessages: string[] = [];

    const sendToClient = (payload: string) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    };

    const sendToOpenAi = (payload: RealtimePayload) => {
      const text = JSON.stringify(payload);
      if (openAiSocket.readyState === WebSocket.OPEN) {
        openAiSocket.send(text);
        return;
      }
      pendingMessages.push(text);
    };

    openAiSocket.on('open', () => {
      this.logger.log(LOGS.REALTIME_OPENAI_CONNECTED);
      sendToOpenAi(buildSessionUpdate());
      while (pendingMessages.length) {
        const message = pendingMessages.shift();
        if (message) {
          openAiSocket.send(message);
        }
      }
      sendToClient(JSON.stringify({ [REALTIME_KEYS.TYPE]: REALTIME_RELAY.READY }));
    });

    openAiSocket.on('message', (data) => {
      const text =
        typeof data === 'string'
          ? data
          : Buffer.isBuffer(data)
            ? data.toString('utf-8')
            : Array.isArray(data)
              ? Buffer.concat(data).toString('utf-8')
              : data.toString();
      sendToClient(text);
    });

    openAiSocket.on('error', () => {
      this.logger.error(LOGS.REALTIME_OPENAI_ERROR);
      const payload = buildRelayError(ERRORS.REALTIME_CONNECTION_FAILED);
      sendToClient(JSON.stringify(payload));
    });

    openAiSocket.on('close', () => {
      this.logger.log(LOGS.REALTIME_OPENAI_CLOSED);
      sendToClient(JSON.stringify({ [REALTIME_KEYS.TYPE]: REALTIME_RELAY.CLOSED }));
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });

    client.on('message', (data) => {
      const payload = parsePayload(data);
      if (!payload || typeof payload[REALTIME_KEYS.TYPE] !== 'string') {
        this.logger.warn(LOGS.REALTIME_CLIENT_INVALID);
        sendToClient(JSON.stringify(buildRelayError(ERRORS.REALTIME_CLIENT_INVALID)));
        return;
      }

      const eventType = payload[REALTIME_KEYS.TYPE] as string;
      if (!ALLOWED_CLIENT_EVENTS.has(eventType)) {
        this.logger.warn(LOGS.REALTIME_CLIENT_INVALID);
        sendToClient(JSON.stringify(buildRelayError(ERRORS.REALTIME_CLIENT_INVALID)));
        return;
      }

      sendToOpenAi(payload);
    });

    client.on('close', () => {
      this.logger.log(LOGS.REALTIME_CLIENT_DISCONNECTED);
      if (openAiSocket.readyState === WebSocket.OPEN) {
        openAiSocket.close();
      }
    });

    client.on('error', (error) => {
      this.logger.error(error);
      if (openAiSocket.readyState === WebSocket.OPEN) {
        openAiSocket.close();
      }
    });
  }
}
