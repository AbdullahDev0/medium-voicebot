/**
 * @file webrtc.service.ts
 * @description WebRTC signaling + realtime relay bridge.
 * @module realtime/webrtc-service
 *
 */

import { Injectable, Logger } from '@nestjs/common';
import type { IncomingMessage } from 'http';
import WebSocket from 'ws';
import * as wrtc from '@roamhq/wrtc';
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
  WEBRTC,
} from '../../constants';
import { config } from '../../config';
import { ToolsService } from '../../tools/tools.service';
import { WebrtcSessionService } from './webrtc-session.service';

type RealtimePayload = Record<string, unknown> & { type?: string };

type SignalingMessage = {
  type?: string;
  sdp?: string;
  candidate?: Record<string, unknown>;
};

const ALLOWED_CLIENT_EVENTS = new Set([
  REALTIME_EVENTS.INPUT_AUDIO_CLEAR,
  REALTIME_EVENTS.INPUT_AUDIO_APPEND,
  REALTIME_EVENTS.INPUT_AUDIO_COMMIT,
  REALTIME_EVENTS.RESPONSE_CREATE,
  REALTIME_EVENTS.RESPONSE_CANCEL,
  REALTIME_EVENTS.CONVERSATION_ITEM_TRUNCATE,
]);

const parsePayload = (data: WebSocket.RawData | string): RealtimePayload | null => {
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

const parseSignaling = (data: WebSocket.RawData): SignalingMessage | null => {
  const payload = parsePayload(data);
  if (!payload) {
    return null;
  }
  return payload as SignalingMessage;
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

const pcm16ToBase64 = (pcm: Int16Array) =>
  Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength).toString('base64');

const base64ToPcm16 = (base64: string) => {
  const buffer = Buffer.from(base64, 'base64');
  return new Int16Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.byteLength / 2));
};

const downmixToMono = (samples: Int16Array, channelCount: number) => {
  if (channelCount <= 1) {
    return samples;
  }
  const frameCount = Math.floor(samples.length / channelCount);
  const mono = new Int16Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;
    const base = frame * channelCount;
    for (let channel = 0; channel < channelCount; channel += 1) {
      sum += samples[base + channel] ?? 0;
    }
    mono[frame] = Math.max(-32768, Math.min(32767, Math.round(sum / channelCount)));
  }
  return mono;
};

const resampleInt16 = (samples: Int16Array, inputRate: number, outputRate: number) => {
  if (inputRate === outputRate) {
    return samples;
  }
  const ratio = inputRate / outputRate;
  const outputLength = Math.max(1, Math.floor(samples.length / ratio));
  const output = new Int16Array(outputLength);
  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio;
    const index = Math.floor(position);
    const nextIndex = Math.min(index + 1, samples.length - 1);
    const weight = position - index;
    const sample =
      (samples[index] ?? 0) * (1 - weight) + (samples[nextIndex] ?? 0) * weight;
    output[i] = Math.max(-32768, Math.min(32767, Math.round(sample)));
  }
  return output;
};

@Injectable()
export class WebrtcService {
  private readonly logger = new Logger(WebrtcService.name);

  constructor(
    private readonly toolsService: ToolsService,
    private readonly sessionService: WebrtcSessionService,
  ) {}

  private logDebug(message: string) {
    if (config.logging.agentDebug) {
      this.logger.log(message);
    }
  }

  handleSignalingConnection(socket: WebSocket, request: IncomingMessage) {
    this.logger.log(LOGS.WEBRTC_SIGNALING_CONNECTED);
    const rawUrl = request.url ?? '';
    const url = new URL(rawUrl, 'http://localhost');
    const sessionId = url.searchParams.get('sessionId') ?? '';
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      socket.send(JSON.stringify({ type: WEBRTC.SIGNALING_ERROR, message: ERRORS.WEBRTC_SESSION_INVALID }));
      socket.close();
      return;
    }

    if (!config.realtime.enabled) {
      socket.send(JSON.stringify({ type: WEBRTC.SIGNALING_ERROR, message: ERRORS.REALTIME_DISABLED }));
      socket.close();
      return;
    }

    if (!config.realtime.apiKey || !config.realtime.url || !config.realtime.model) {
      socket.send(JSON.stringify({ type: WEBRTC.SIGNALING_ERROR, message: ERRORS.REALTIME_SESSION_FAILED }));
      socket.close();
      return;
    }

    const pc = new wrtc.RTCPeerConnection({
      iceServers: config.webrtc.iceServers as unknown as Array<Record<string, unknown>>,
    });
    this.logDebug(LOGS.WEBRTC_PEER_CONNECTED);

    const audioSource = new wrtc.nonstandard.RTCAudioSource();
    const outgoingTrack = audioSource.createTrack();
    pc.addTrack(outgoingTrack);
    this.logDebug(LOGS.WEBRTC_AUDIO_SOURCE_READY);

    let audioSink: wrtc.nonstandard.RTCAudioSink | null = null;
    let dataChannel: any = null;
    let responseActive = false;
    let captureActive = false;
    let assistantSpeaking = false;
    const pendingMessages: string[] = [];
    const pendingClientMessages: Record<string, unknown>[] = [];

    const tools = config.tools.enabled ? this.toolsService.getToolDefinitions() : [];
    const filteredTools = session.usePropertyTools
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
    const instructions = session.usePropertyTools ? TOOLING.PROPERTY_TOOL_INSTRUCTIONS : '';
    const toolNames = filteredTools
      .map((tool) => (tool as Record<string, unknown>)[OPENAI.FUNCTION_NAME_KEY])
      .filter((name): name is string => typeof name === 'string' && name.length > 0);

    let lastAudioAppendLog = 0;
    let audioAppendCount = 0;
    const audioAppendLogIntervalMs = 1500;

    const sendToClient = (payload: Record<string, unknown>) => {
      if (!dataChannel || dataChannel.readyState !== 'open') {
        pendingClientMessages.push(payload);
        return;
      }
      dataChannel.send(JSON.stringify(payload));
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
        sendToClient(buildRelayError(ERRORS.REALTIME_TOOL_FAILED));
      }
    };

    const openAiSocket = new WebSocket(buildOpenAiUrl(), {
      headers: {
        [HTTP.HEADER_AUTH]: `${HTTP.BEARER_PREFIX}${config.realtime.apiKey}`,
      },
    });

    openAiSocket.on('open', () => {
      this.logger.log(LOGS.REALTIME_OPENAI_CONNECTED);
      this.logDebug(LOGS.REALTIME_SESSION_UPDATE);
      if (toolNames.length) {
        this.logDebug(`${LOGS.REALTIME_SESSION_TOOLS}${toolNames.join(DELIMITERS.COMMA_SPACE)}`);
      }
      sendToOpenAi(buildSessionUpdate(filteredTools, instructions));
      while (pendingMessages.length) {
        const message = pendingMessages.shift();
        if (message) {
          openAiSocket.send(message);
        }
      }
      sendToClient({ [REALTIME_KEYS.TYPE]: REALTIME_RELAY.READY });
    });

    openAiSocket.on('message', (data) => {
      const payload = parsePayload(data);
      if (payload) {
        const typeValue = payload[REALTIME_KEYS.TYPE];
        if (typeof typeValue === 'string') {
          this.logDebug(`${LOGS.REALTIME_OPENAI_EVENT}${typeValue}`);
          if (typeValue === REALTIME_EVENTS.RESPONSE_CREATED) {
            responseActive = true;
          }
          if (typeValue === REALTIME_EVENTS.RESPONSE_DONE) {
            responseActive = false;
          }
          if (typeValue === REALTIME_EVENTS.RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE) {
            void handleToolCall(payload);
          }
          if (typeValue === REALTIME_EVENTS.OUTPUT_AUDIO_DELTA) {
            const audioValue = payload[REALTIME_KEYS.AUDIO];
            if (typeof audioValue === 'string' && audioValue) {
              const pcm = base64ToPcm16(audioValue);
              const resampled = resampleInt16(pcm, REALTIME.AUDIO_SAMPLE_RATE, WEBRTC.AUDIO_SAMPLE_RATE);
              audioSource.onData({
                samples: resampled,
                sampleRate: WEBRTC.AUDIO_SAMPLE_RATE,
                bitsPerSample: WEBRTC.AUDIO_BITS_PER_SAMPLE,
                channelCount: WEBRTC.AUDIO_CHANNELS,
                numberOfFrames: resampled.length,
              });
              if (!assistantSpeaking) {
                assistantSpeaking = true;
                sendToClient({ [REALTIME_KEYS.TYPE]: WEBRTC.ASSISTANT_SPEAKING, speaking: true });
              }
            }
            return;
          }
          if (typeValue === REALTIME_EVENTS.OUTPUT_AUDIO_DONE) {
            if (assistantSpeaking) {
              assistantSpeaking = false;
              sendToClient({ [REALTIME_KEYS.TYPE]: WEBRTC.ASSISTANT_SPEAKING, speaking: false });
            }
            sendToClient({ [REALTIME_KEYS.TYPE]: WEBRTC.PLAYBACK_DONE });
          }
        }
      }
      if (payload && payload[REALTIME_KEYS.TYPE] !== REALTIME_EVENTS.OUTPUT_AUDIO_DELTA) {
        sendToClient(payload);
      }
    });

    openAiSocket.on('error', () => {
      this.logger.error(LOGS.REALTIME_OPENAI_ERROR);
      sendToClient(buildRelayError(ERRORS.REALTIME_CONNECTION_FAILED));
    });

    openAiSocket.on('close', () => {
      this.logger.log(LOGS.REALTIME_OPENAI_CLOSED);
      responseActive = false;
      sendToClient({ [REALTIME_KEYS.TYPE]: REALTIME_RELAY.CLOSED });
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    });

    pc.ondatachannel = (event) => {
      dataChannel = event.channel;
      dataChannel.onopen = () => {
        this.logDebug(LOGS.WEBRTC_DATA_CHANNEL_OPEN);
        while (pendingClientMessages.length) {
          const message = pendingClientMessages.shift();
          if (message) {
            dataChannel?.send(JSON.stringify(message));
          }
        }
      };
      dataChannel.onclose = () => {
        this.logDebug(LOGS.WEBRTC_DATA_CHANNEL_CLOSED);
      };
      dataChannel.onmessage = (event) => {
        const payload = parsePayload(event.data ?? '');
        if (!payload || typeof payload[REALTIME_KEYS.TYPE] !== 'string') {
          sendToClient(buildRelayError(ERRORS.REALTIME_CLIENT_INVALID));
          return;
        }

        const eventType = payload[REALTIME_KEYS.TYPE] as string;
        if (!ALLOWED_CLIENT_EVENTS.has(eventType)) {
          sendToClient(buildRelayError(ERRORS.REALTIME_CLIENT_INVALID));
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

        if (eventType === REALTIME_EVENTS.INPUT_AUDIO_CLEAR) {
          captureActive = true;
        }
        if (eventType === REALTIME_EVENTS.INPUT_AUDIO_COMMIT) {
          captureActive = false;
        }

        if (eventType === REALTIME_EVENTS.INPUT_AUDIO_APPEND) {
          audioAppendCount += 1;
          const now = Date.now();
          if (now - lastAudioAppendLog >= audioAppendLogIntervalMs) {
            lastAudioAppendLog = now;
            this.logDebug(`${LOGS.REALTIME_CLIENT_AUDIO_APPEND}${audioAppendCount}`);
            audioAppendCount = 0;
          }
        }

        sendToOpenAi(payload);
      };
    };

    pc.ontrack = (event) => {
      if (event.track?.kind !== 'audio') {
        return;
      }
      audioSink?.stop();
      audioSink = new wrtc.nonstandard.RTCAudioSink(event.track);
      this.logDebug(LOGS.WEBRTC_AUDIO_SINK_READY);
      audioSink.ondata = (data) => {
        if (!captureActive) {
          return;
        }
        const mono = downmixToMono(data.samples, data.channelCount ?? WEBRTC.AUDIO_CHANNELS);
        const resampled = resampleInt16(mono, data.sampleRate ?? WEBRTC.AUDIO_SAMPLE_RATE, REALTIME.AUDIO_SAMPLE_RATE);
        const base64 = pcm16ToBase64(resampled);
        const payload = {
          [REALTIME_KEYS.TYPE]: REALTIME_EVENTS.INPUT_AUDIO_APPEND,
          [REALTIME_KEYS.AUDIO]: base64,
        };
        const now = Date.now();
        audioAppendCount += 1;
        if (now - lastAudioAppendLog >= audioAppendLogIntervalMs) {
          lastAudioAppendLog = now;
          this.logDebug(`${LOGS.REALTIME_CLIENT_AUDIO_APPEND}${audioAppendCount}`);
          audioAppendCount = 0;
        }
        sendToOpenAi(payload);
      };
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'failed') {
        this.logger.warn(LOGS.WEBRTC_PEER_FAILED);
        socket.close();
      }
      if (state === 'disconnected' || state === 'closed') {
        this.logger.log(LOGS.WEBRTC_PEER_DISCONNECTED);
        socket.close();
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: WEBRTC.SIGNALING_ICE, candidate: event.candidate }));
      }
    };

    socket.on('message', async (data) => {
      const message = parseSignaling(data);
      if (!message || typeof message.type !== 'string') {
        return;
      }
      this.logDebug(`${LOGS.WEBRTC_SIGNALING_MESSAGE}${message.type}`);
      if (message.type === WEBRTC.SIGNALING_OFFER && message.sdp) {
        await pc.setRemoteDescription({ type: 'offer', sdp: message.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: WEBRTC.SIGNALING_ANSWER, sdp: answer.sdp }));
        }
        return;
      }
      if (message.type === WEBRTC.SIGNALING_ICE && message.candidate) {
        try {
          await pc.addIceCandidate(message.candidate);
        } catch {
          // Ignore bad candidates.
        }
      }
    });

    socket.on('close', () => {
      this.logger.log(LOGS.WEBRTC_SIGNALING_DISCONNECTED);
      if (audioSink) {
        audioSink.stop();
        audioSink = null;
      }
      outgoingTrack.stop();
      pc.close();
      if (openAiSocket.readyState === WebSocket.OPEN) {
        openAiSocket.close();
      }
    });

    socket.on('error', () => {
      this.logger.log(LOGS.WEBRTC_SIGNALING_DISCONNECTED);
    });
  }
}
