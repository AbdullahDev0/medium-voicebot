/**
 * @file useRealtimeSession.ts
 * @description Realtime websocket and audio streaming hook.
 * @module hooks/useRealtimeSession
 *
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ERRORS, REALTIME, REALTIME_AUDIO, REALTIME_TIMEOUTS } from '../constants';
import { config } from '../config';
import {
  base64ToPcm16,
  downsampleBuffer,
  floatToPcm16,
  pcm16ToBase64,
  pcm16ToFloat,
} from '../utils/audio';

type TranscriptDeltaHandler = (id: string, text: string) => void;

type UseRealtimeSessionOptions = {
  onUserTranscriptDelta?: TranscriptDeltaHandler;
  onAssistantTranscriptDelta?: TranscriptDeltaHandler;
  onError?: (message: string) => void;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
};

type RealtimeEvent = Record<string, unknown> & { type?: string };

const parseEvent = (payload: string): RealtimeEvent | null => {
  try {
    const parsed = JSON.parse(payload) as RealtimeEvent;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const getTextValue = (event: RealtimeEvent) => {
  const delta = event[REALTIME.DELTA_KEY];
  if (typeof delta === 'string') {
    return delta;
  }
  const transcript = event[REALTIME.TRANSCRIPT_KEY];
  if (typeof transcript === 'string') {
    return transcript;
  }
  return '';
};

const getAudioValue = (event: RealtimeEvent) => {
  const audio = event[REALTIME.AUDIO_KEY];
  if (typeof audio === 'string') {
    return audio;
  }
  const delta = event[REALTIME.DELTA_KEY];
  if (typeof delta === 'string') {
    return delta;
  }
  return '';
};

const getItemId = (event: RealtimeEvent) => {
  const itemId = event[REALTIME.ITEM_ID_KEY];
  if (typeof itemId === 'string' && itemId) {
    return itemId;
  }
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
};

export const useRealtimeSession = ({
  onUserTranscriptDelta,
  onAssistantTranscriptDelta,
  onError,
  onPlaybackStart,
  onPlaybackEnd,
}: UseRealtimeSessionOptions) => {
  const socketRef = useRef<WebSocket | null>(null);
  const isConnectingRef = useRef(false);
  const readyWaitersRef = useRef<Array<(ready: boolean) => void>>([]);
  const connectTimeoutRef = useRef<number | null>(null);
  const skipCommitRef = useRef(false);
  const hasPendingAudioRef = useRef(false);
  const callbacksRef = useRef({
    onUserTranscriptDelta,
    onAssistantTranscriptDelta,
    onError,
    onPlaybackStart,
    onPlaybackEnd,
  });
  const captureStreamRef = useRef<MediaStream | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const captureSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const captureProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const captureGainRef = useRef<GainNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const playbackEndTimerRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const isPlayingRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    callbacksRef.current = {
      onUserTranscriptDelta,
      onAssistantTranscriptDelta,
      onError,
      onPlaybackStart,
      onPlaybackEnd,
    };
  }, [onUserTranscriptDelta, onAssistantTranscriptDelta, onError, onPlaybackStart, onPlaybackEnd]);

  const clearPlaybackTimer = () => {
    if (playbackEndTimerRef.current) {
      window.clearTimeout(playbackEndTimerRef.current);
      playbackEndTimerRef.current = null;
    }
  };

  const resolveWaiters = useCallback((ready: boolean) => {
    readyWaitersRef.current.forEach((resolve) => resolve(ready));
    readyWaitersRef.current = [];
    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const schedulePlaybackEnd = useCallback(() => {
    const context = playbackContextRef.current;
    if (!context) {
      return;
    }
    const remainingSeconds = Math.max(
      nextPlaybackTimeRef.current - context.currentTime,
      0
    );
    clearPlaybackTimer();
    playbackEndTimerRef.current = window.setTimeout(() => {
      isPlayingRef.current = false;
      setIsPlaying(false);
      callbacksRef.current.onPlaybackEnd?.();
    }, remainingSeconds * 1000);
  }, []);

  const ensurePlaybackContext = useCallback(() => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({
        sampleRate: REALTIME_AUDIO.TARGET_SAMPLE_RATE,
      });
    }
    if (playbackContextRef.current.state === 'suspended') {
      void playbackContextRef.current.resume();
    }
    return playbackContextRef.current;
  }, []);

  const stopPlayback = useCallback(async () => {
    clearPlaybackTimer();
    isPlayingRef.current = false;
    setIsPlaying(false);
    callbacksRef.current.onPlaybackEnd?.();
    if (playbackContextRef.current) {
      await playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    nextPlaybackTimeRef.current = 0;
  }, []);

  const playAudioChunk = useCallback(
    (base64: string) => {
      const context = ensurePlaybackContext();
      const pcm16 = base64ToPcm16(base64);
      const floatData = pcm16ToFloat(pcm16);
      const buffer = context.createBuffer(
        REALTIME_AUDIO.CHANNELS,
        floatData.length,
        REALTIME_AUDIO.TARGET_SAMPLE_RATE
      );
      buffer.getChannelData(0).set(floatData);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      const startTime = Math.max(context.currentTime, nextPlaybackTimeRef.current);
      source.start(startTime);
      nextPlaybackTimeRef.current = startTime + buffer.duration;
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        callbacksRef.current.onPlaybackStart?.();
      }
    },
    [ensurePlaybackContext]
  );

  const sendEvent = useCallback((event: RealtimeEvent) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify(event));
    return true;
  }, []);

  const stopCapture = useCallback(async () => {
    if (captureProcessorRef.current) {
      captureProcessorRef.current.disconnect();
      captureProcessorRef.current.onaudioprocess = null;
      captureProcessorRef.current = null;
    }

    if (captureGainRef.current) {
      captureGainRef.current.disconnect();
      captureGainRef.current = null;
    }

    if (captureSourceRef.current) {
      captureSourceRef.current.disconnect();
      captureSourceRef.current = null;
    }

    if (captureStreamRef.current) {
      captureStreamRef.current.getTracks().forEach((track) => track.stop());
      captureStreamRef.current = null;
    }

    if (captureContextRef.current) {
      await captureContextRef.current.close();
      captureContextRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) {
      return;
    }

    isRecordingRef.current = false;
    setIsRecording(false);
    await stopCapture();
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      hasPendingAudioRef.current = false;
      return;
    }
    if (!hasPendingAudioRef.current) {
      return;
    }
    const committed = sendEvent({ type: REALTIME.INPUT_AUDIO_COMMIT });
    const responded = sendEvent({ type: REALTIME.RESPONSE_CREATE });
    if (committed && responded) {
      hasPendingAudioRef.current = false;
    }
  }, [sendEvent, stopCapture]);

  const connect = useCallback(async () => {
    if (!config.realtime.enabled) {
      const message = ERRORS.REALTIME_DISABLED;
      callbacksRef.current.onError?.(message);
      return false;
    }

    if (isConnected) {
      return true;
    }

    if (socketRef.current || isConnectingRef.current) {
      return new Promise<boolean>((resolve) => {
        readyWaitersRef.current.push(resolve);
      });
    }

    setIsConnecting(true);
    isConnectingRef.current = true;
    const socket = new WebSocket(config.realtime.wsUrl);
    socketRef.current = socket;

    connectTimeoutRef.current = window.setTimeout(() => {
      resolveWaiters(false);
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    }, REALTIME_TIMEOUTS.CONNECT_MS);

    socket.onopen = () => {
      setIsConnecting(false);
      isConnectingRef.current = false;
    };

    socket.onmessage = (event) => {
      const payload = typeof event.data === 'string' ? event.data : '';
      const parsed = parseEvent(payload);
      if (!parsed) {
        return;
      }
      const type = parsed[REALTIME.TYPE_KEY];
      if (type === REALTIME.READY) {
        setIsConnected(true);
        resolveWaiters(true);
        return;
      }
      if (type === REALTIME.CLOSED) {
        setIsConnected(false);
        resolveWaiters(false);
        return;
      }
      if (type === REALTIME.ERROR) {
        const messageValue = parsed[REALTIME.MESSAGE_KEY];
        const message =
          typeof messageValue === 'string'
            ? messageValue
            : ERRORS.REALTIME_STREAM_FAILED;
        callbacksRef.current.onError?.(message);
        resolveWaiters(false);
        return;
      }
      if (type === REALTIME.OUTPUT_AUDIO_DELTA) {
        const audio = getAudioValue(parsed);
        if (audio) {
          playAudioChunk(audio);
        }
        return;
      }
      if (type === REALTIME.INPUT_AUDIO_SPEECH_STOPPED) {
        if (!isRecordingRef.current) {
          return;
        }
        if (!hasPendingAudioRef.current) {
          return;
        }
        const committed = sendEvent({ type: REALTIME.INPUT_AUDIO_COMMIT });
        const responded = sendEvent({ type: REALTIME.RESPONSE_CREATE });
        if (committed && responded) {
          hasPendingAudioRef.current = false;
        }
        return;
      }
      if (type === REALTIME.OUTPUT_AUDIO_DONE) {
        schedulePlaybackEnd();
        return;
      }
      if (type === REALTIME.OUTPUT_AUDIO_TRANSCRIPT_DELTA) {
        const text = getTextValue(parsed);
        if (text) {
          callbacksRef.current.onAssistantTranscriptDelta?.(getItemId(parsed), text);
        }
        return;
      }
      if (type === REALTIME.INPUT_AUDIO_TRANSCRIPT_DELTA) {
        const text = getTextValue(parsed);
        if (text) {
          callbacksRef.current.onUserTranscriptDelta?.(getItemId(parsed), text);
        }
        return;
      }
      if (type === REALTIME.INPUT_AUDIO_TRANSCRIPT_FAILED) {
        callbacksRef.current.onError?.(ERRORS.STT_FAILED);
      }
    };

    socket.onerror = () => {
      setIsConnecting(false);
      isConnectingRef.current = false;
      resolveWaiters(false);
      callbacksRef.current.onError?.(ERRORS.REALTIME_CONNECTION_FAILED);
    };

    socket.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      isConnectingRef.current = false;
      resolveWaiters(false);
      socketRef.current = null;
      void stopRecording();
      void stopPlayback();
    };
    return new Promise<boolean>((resolve) => {
      readyWaitersRef.current.push(resolve);
    });
  }, [
    isConnected,
    playAudioChunk,
    resolveWaiters,
    schedulePlaybackEnd,
    sendEvent,
    stopPlayback,
    stopRecording,
  ]);

  const startRecording = useCallback(async () => {
    if (!config.realtime.enabled) {
      const message = ERRORS.REALTIME_DISABLED;
      callbacksRef.current.onError?.(message);
      return false;
    }

    const ready = await connect();
    if (!ready) {
      const message = ERRORS.REALTIME_CONNECTION_FAILED;
      callbacksRef.current.onError?.(message);
      return false;
    }

    if (isRecordingRef.current) {
      return true;
    }

    await stopPlayback();
    sendEvent({ type: REALTIME.RESPONSE_CANCEL });
    const cleared = sendEvent({ type: REALTIME.INPUT_AUDIO_CLEAR });
    hasPendingAudioRef.current = false;
    if (!cleared) {
      const message = ERRORS.REALTIME_SESSION_FAILED;
      callbacksRef.current.onError?.(message);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(
        REALTIME_AUDIO.BUFFER_SIZE,
        REALTIME_AUDIO.CHANNELS,
        REALTIME_AUDIO.CHANNELS
      );
      const gain = audioContext.createGain();
      gain.gain.value = 0;

      processor.onaudioprocess = (event) => {
        if (!isRecordingRef.current) {
          return;
        }
        const inputData = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(
          inputData,
          audioContext.sampleRate,
          REALTIME_AUDIO.TARGET_SAMPLE_RATE
        );
        const pcm16 = floatToPcm16(downsampled);
        const base64 = pcm16ToBase64(pcm16);
        const appended = sendEvent({ type: REALTIME.INPUT_AUDIO_APPEND, audio: base64 });
        if (appended) {
          hasPendingAudioRef.current = true;
        }
      };

      source.connect(processor);
      processor.connect(gain);
      gain.connect(audioContext.destination);

      captureStreamRef.current = stream;
      captureContextRef.current = audioContext;
      captureSourceRef.current = source;
      captureProcessorRef.current = processor;
      captureGainRef.current = gain;

      isRecordingRef.current = true;
      setIsRecording(true);

      return true;
    } catch {
      const message = ERRORS.MIC_UNAVAILABLE;
      callbacksRef.current.onError?.(message);
      await stopCapture();
      return false;
    }
  }, [connect, sendEvent, stopCapture, stopPlayback]);

  const stopSession = useCallback(async () => {
    skipCommitRef.current = true;
    hasPendingAudioRef.current = false;
    isRecordingRef.current = false;
    setIsRecording(false);
    await stopCapture();
    await stopPlayback();
    sendEvent({ type: REALTIME.RESPONSE_CANCEL });
    sendEvent({ type: REALTIME.INPUT_AUDIO_CLEAR });
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    isConnectingRef.current = false;
    resolveWaiters(false);
  }, [resolveWaiters, sendEvent, stopCapture, stopPlayback]);

  const disconnect = useCallback(async () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    isConnectingRef.current = false;
    resolveWaiters(false);
    await stopRecording();
    await stopPlayback();
  }, [resolveWaiters, stopPlayback, stopRecording]);

  useEffect(() => () => {
    void disconnect();
  }, [disconnect]);

  return {
    connect,
    disconnect,
    startRecording,
    stopSession,
    stopRecording,
    stopPlayback,
    isConnected,
    isConnecting,
    isRecording,
    isPlaying,
  };
};
