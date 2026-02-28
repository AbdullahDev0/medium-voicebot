/**
 * @file realtime.service.ts
 * @description Realtime websocket relay service.
 * @module realtime/service
 *
 */

import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';
import {
  DELIMITERS,
  ERRORS,
  HTTP,
  LOGS,
  OPENAI,
  REALTIME,
  REALTIME_EVENTS,
  REALTIME_KEYS,
  REALTIME_RELAY,
  TOOLING,
  TOOLS,
} from '../constants';
import { config } from '../config';
import { ToolsService } from '../tools/tools.service';

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

const buildSessionUpdate = (tools: unknown[], instructions: string) => {
  const session: Record<string, unknown> = {
    [REALTIME_KEYS.TYPE]: REALTIME.SESSION_TYPE,
    [REALTIME_KEYS.OUTPUT_MODALITIES]: REALTIME.OUTPUT_MODALITIES_AUDIO,
    [REALTIME_KEYS.AUDIO]: {
      [REALTIME_KEYS.AUDIO_INPUT]: {
        [REALTIME_KEYS.AUDIO_FORMAT]: {
          [REALTIME_KEYS.AUDIO_FORMAT_TYPE]: REALTIME.AUDIO_FORMAT_PCM,
          [REALTIME_KEYS.AUDIO_FORMAT_RATE]: REALTIME.AUDIO_SAMPLE_RATE,
        },
        [REALTIME_KEYS.TURN_DETECTION]: REALTIME.TURN_DETECTION_SERVER_VAD,
      },
      [REALTIME_KEYS.AUDIO_OUTPUT]: {
        [REALTIME_KEYS.AUDIO_FORMAT]: {
          [REALTIME_KEYS.AUDIO_FORMAT_TYPE]: REALTIME.AUDIO_FORMAT_PCM,
          [REALTIME_KEYS.AUDIO_FORMAT_RATE]: REALTIME.AUDIO_SAMPLE_RATE,
        },
        [REALTIME_KEYS.VOICE]: config.realtime.voice,
      },
    },
  };

  if (config.realtime.transcriptionModel) {
    const audio = session[REALTIME_KEYS.AUDIO] as Record<string, unknown>;
    const audioInput = audio[REALTIME_KEYS.AUDIO_INPUT] as Record<string, unknown>;
    audioInput[REALTIME_KEYS.AUDIO_TRANSCRIPTION] = {
      [REALTIME_KEYS.MODEL]: config.realtime.transcriptionModel,
    };
  }
  if (tools.length) {
    session[OPENAI.TOOLS_KEY] = tools;
    session[OPENAI.TOOL_CHOICE_KEY] = REALTIME.TOOL_CHOICE_AUTO;
  }
  if (instructions) {
    session[OPENAI.INSTRUCTIONS_KEY] = instructions;
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

  constructor(private readonly toolsService: ToolsService) {}

  private logDebug(message: string) {
    if (config.logging.agentDebug) {
      this.logger.log(message);
    }
  }

  handleClientConnection(client: WebSocket, usePropertyTools: boolean) {
    this.logger.log(LOGS.REALTIME_CLIENT_CONNECTED);
    this.logDebug(
      `${LOGS.REALTIME_CLIENT_ROUTE}${
        usePropertyTools ? REALTIME.PROPERTIES_WS_PATH : REALTIME.WS_PATH
      }`,
    );
    if (!config.realtime.enabled) {
      this.logger.warn(LOGS.REALTIME_DISABLED);
      const payload = buildRelayError(ERRORS.REALTIME_DISABLED);
      client.send(JSON.stringify(payload));
      client.close();
      return;
    }
    if (usePropertyTools && !config.tools.ragEnabled) {
      this.logger.warn(LOGS.REALTIME_PROPERTIES_DISABLED);
      const payload = buildRelayError(ERRORS.RAG_DISABLED);
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

    this.logDebug(`${LOGS.REALTIME_OPENAI_CONNECTING}${buildOpenAiUrl()}`);
    const openAiSocket = new WebSocket(buildOpenAiUrl(), {
      headers: {
        [HTTP.HEADER_AUTH]: `${HTTP.BEARER_PREFIX}${config.realtime.apiKey}`,
      },
    });

    const pendingMessages: string[] = [];
    const tools = config.tools.enabled ? this.toolsService.getToolDefinitions() : [];
    const filteredTools = usePropertyTools
      ? tools.filter(
          (tool) =>
            (tool as Record<string, unknown>)[OPENAI.FUNCTION_NAME_KEY] ===
            TOOLS.PROPERTY_SEARCH,
        )
      : tools.filter(
          (tool) =>
            (tool as Record<string, unknown>)[OPENAI.FUNCTION_NAME_KEY] !==
            TOOLS.PROPERTY_SEARCH,
        );
    const instructions = usePropertyTools
      ? TOOLING.PROPERTY_TOOL_INSTRUCTIONS
      : '';
    const toolNames = filteredTools
      .map(
        (tool) => (tool as Record<string, unknown>)[OPENAI.FUNCTION_NAME_KEY],
      )
      .filter((name): name is string => typeof name === 'string' && name.length > 0);
    let lastAudioAppendLog = 0;
    let audioAppendCount = 0;
    const audioAppendLogIntervalMs = 1500;
    const logClientEvent = (eventType: string) => {
      if (eventType === REALTIME_EVENTS.INPUT_AUDIO_APPEND) {
        audioAppendCount += 1;
        const now = Date.now();
        if (now - lastAudioAppendLog < audioAppendLogIntervalMs) {
          return;
        }
        lastAudioAppendLog = now;
        this.logDebug(`${LOGS.REALTIME_CLIENT_AUDIO_APPEND}${audioAppendCount}`);
        audioAppendCount = 0;
        return;
      }
      this.logDebug(`${LOGS.REALTIME_CLIENT_EVENT}${eventType}`);
    };
    const logOpenAiEvent = (eventType: string) => {
      this.logDebug(`${LOGS.REALTIME_OPENAI_EVENT}${eventType}`);
    };
    const logOpenAiErrorDetail = (payload: RealtimePayload, eventType: string) => {
      if (!eventType.includes(REALTIME.ERROR_TOKEN)) {
        return;
      }
      const details = JSON.stringify(payload);
      this.logger.error(`${LOGS.REALTIME_OPENAI_ERROR_DETAIL}${details}`);
    };
    let responseActive = false;

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

    const handleToolCall = async (payload: RealtimePayload) => {
      if (!config.tools.enabled) {
        return;
      }
      const nameValue = payload[OPENAI.TOOL_CALL_NAME_KEY];
      const callIdValue = payload[OPENAI.TOOL_CALL_ID_KEY];
      if (typeof nameValue !== 'string' || typeof callIdValue !== 'string') {
        return;
      }
      const argsValue = payload[OPENAI.TOOL_CALL_ARGUMENTS_KEY];
      try {
        this.logger.log(LOGS.REALTIME_TOOL_CALL);
        this.logDebug(`${LOGS.REALTIME_TOOL_CALL_NAME}${nameValue}`);
        const [toolOutput] = await this.toolsService.runToolCalls([
          {
            name: nameValue,
            callId: callIdValue,
            args: argsValue,
          },
        ]);
        if (!toolOutput) {
          return;
        }
        sendToOpenAi({
          [REALTIME_KEYS.TYPE]: REALTIME_EVENTS.CONVERSATION_ITEM_CREATE,
          [REALTIME_KEYS.ITEM]: {
            [REALTIME_KEYS.TYPE]: OPENAI.TOOL_CALL_OUTPUT_TYPE,
            [OPENAI.TOOL_CALL_ID_KEY]: toolOutput.callId,
            [OPENAI.TOOL_OUTPUT_KEY]: toolOutput.output,
          },
        });
        sendToOpenAi({ [REALTIME_KEYS.TYPE]: REALTIME_EVENTS.RESPONSE_CREATE });
      } catch {
        this.logger.error(LOGS.REALTIME_TOOL_CALL_FAILED);
        sendToClient(
          JSON.stringify(buildRelayError(ERRORS.REALTIME_TOOL_FAILED)),
        );
      }
    };

    openAiSocket.on('open', () => {
      this.logger.log(LOGS.REALTIME_OPENAI_CONNECTED);
      this.logDebug(LOGS.REALTIME_SESSION_UPDATE);
      if (toolNames.length) {
        this.logDebug(
          `${LOGS.REALTIME_SESSION_TOOLS}${toolNames.join(DELIMITERS.COMMA_SPACE)}`,
        );
      }
      sendToOpenAi(buildSessionUpdate(filteredTools, instructions));
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
      const payload = parsePayload(data);
      if (payload) {
        const typeValue = payload[REALTIME_KEYS.TYPE];
        if (typeof typeValue === 'string') {
          logOpenAiEvent(typeValue);
          logOpenAiErrorDetail(payload, typeValue);
          if (typeValue === REALTIME_EVENTS.RESPONSE_CREATED) {
            responseActive = true;
          }
          if (typeValue === REALTIME_EVENTS.RESPONSE_DONE) {
            responseActive = false;
          }
        } else {
          this.logDebug(LOGS.REALTIME_OPENAI_EVENT_UNPARSED);
        }
        if (typeValue === REALTIME_EVENTS.RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE) {
          void handleToolCall(payload);
        }
      } else {
        this.logDebug(LOGS.REALTIME_OPENAI_EVENT_UNPARSED);
      }
      sendToClient(text);
    });

    openAiSocket.on('error', () => {
      this.logger.error(LOGS.REALTIME_OPENAI_ERROR);
      const payload = buildRelayError(ERRORS.REALTIME_CONNECTION_FAILED);
      sendToClient(JSON.stringify(payload));
    });

    openAiSocket.on('close', () => {
      this.logger.log(LOGS.REALTIME_OPENAI_CLOSED);
      responseActive = false;
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

      if (eventType === REALTIME_EVENTS.RESPONSE_CREATE && responseActive) {
        this.logDebug(`${LOGS.REALTIME_CLIENT_EVENT_SKIPPED}${eventType}`);
        return;
      }
      if (eventType === REALTIME_EVENTS.RESPONSE_CANCEL && !responseActive) {
        this.logDebug(`${LOGS.REALTIME_CLIENT_EVENT_SKIPPED}${eventType}`);
        return;
      }

      logClientEvent(eventType);
      sendToOpenAi(payload);
    });

    client.on('close', () => {
      this.logger.log(LOGS.REALTIME_CLIENT_DISCONNECTED);
      if (openAiSocket.readyState === WebSocket.OPEN) {
        openAiSocket.close();
      }
      responseActive = false;
    });

    client.on('error', (error) => {
      this.logger.error(error);
      if (openAiSocket.readyState === WebSocket.OPEN) {
        openAiSocket.close();
      }
    });

  }
}
