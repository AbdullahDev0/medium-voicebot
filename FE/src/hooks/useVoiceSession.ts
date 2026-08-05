/**
 * @file useVoiceSession.ts
 * @description Realtime voice session with WebRTC default and WS fallback.
 * @module hooks/useVoiceSession
 *
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { ERRORS } from '../constants';
import { config } from '../config';
import { useRealtimeSession } from './useRealtimeSession';
import { useWebrtcSession } from './useWebrtcSession';

type TranscriptDeltaHandler = (id: string, text: string) => void;

type UseVoiceSessionOptions = {
  onUserTranscriptDelta?: TranscriptDeltaHandler;
  onAssistantTranscriptDelta?: TranscriptDeltaHandler;
  onError?: (message: string) => void;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  wsUrl?: string;
  usePropertyTools?: boolean;
};

type Transport = 'webrtc' | 'ws';

export const useVoiceSession = ({
  onUserTranscriptDelta,
  onAssistantTranscriptDelta,
  onError,
  onPlaybackStart,
  onPlaybackEnd,
  wsUrl,
  usePropertyTools,
}: UseVoiceSessionOptions) => {
  const [transport, setTransport] = useState<Transport | null>(null);
  const fallbackTriggeredRef = useRef(false);

  const handleWebrtcError = useCallback(
    (message: string) => {
      if (transport === 'webrtc' || fallbackTriggeredRef.current) {
        onError?.(message);
      }
    },
    [onError, transport],
  );

  const webrtcSession = useWebrtcSession({
    onUserTranscriptDelta,
    onAssistantTranscriptDelta,
    onError: handleWebrtcError,
    onPlaybackStart,
    onPlaybackEnd,
    usePropertyTools,
  });

  const wsSession = useRealtimeSession({
    onUserTranscriptDelta,
    onAssistantTranscriptDelta,
    onError,
    onPlaybackStart,
    onPlaybackEnd,
    wsUrl,
  });

  const tryWebrtcFirst = config.realtime.preferWebrtc && webrtcSession.isSupported;

  const startRecording = useCallback(async () => {
    if (!config.realtime.enabled) {
      onError?.(ERRORS.REALTIME_DISABLED);
      return false;
    }

    if (tryWebrtcFirst && !fallbackTriggeredRef.current) {
      const started = await webrtcSession.startRecording();
      if (started) {
        setTransport('webrtc');
        return true;
      }
      fallbackTriggeredRef.current = true;
    }

    const wsStarted = await wsSession.startRecording();
    if (wsStarted) {
      setTransport('ws');
      return true;
    }

    onError?.(ERRORS.REALTIME_CONNECTION_FAILED);
    return false;
  }, [onError, tryWebrtcFirst, webrtcSession, wsSession]);

  const stopRecording = useCallback(async () => {
    if (transport === 'webrtc') {
      await webrtcSession.stopRecording();
      return;
    }
    await wsSession.stopRecording();
  }, [transport, webrtcSession, wsSession]);

  const stopPlayback = useCallback(async () => {
    if (transport === 'webrtc') {
      await webrtcSession.stopPlayback();
      return;
    }
    await wsSession.stopPlayback();
  }, [transport, webrtcSession, wsSession]);

  const stopSession = useCallback(async () => {
    if (transport === 'webrtc') {
      await webrtcSession.stopSession();
      setTransport(null);
      fallbackTriggeredRef.current = false;
      return;
    }
    await wsSession.stopSession();
    setTransport(null);
    fallbackTriggeredRef.current = false;
  }, [transport, webrtcSession, wsSession]);

  const disconnect = useCallback(async () => {
    await webrtcSession.disconnect();
    await wsSession.disconnect();
    setTransport(null);
    fallbackTriggeredRef.current = false;
  }, [webrtcSession, wsSession]);

  const connect = useCallback(async () => {
    if (transport === 'webrtc') {
      return webrtcSession.connect();
    }
    if (transport === 'ws') {
      return wsSession.connect();
    }
    return false;
  }, [transport, webrtcSession, wsSession]);

  const status = useMemo(() => {
    const active = transport === 'webrtc' ? webrtcSession : wsSession;
    return {
      isConnected: active.isConnected,
      isConnecting: active.isConnecting,
      isRecording: active.isRecording,
      isPlaying: active.isPlaying,
    };
  }, [transport, webrtcSession, wsSession]);

  return {
    connect,
    disconnect,
    startRecording,
    stopRecording,
    stopPlayback,
    stopSession,
    isConnected: status.isConnected,
    isConnecting: status.isConnecting,
    isRecording: status.isRecording,
    isPlaying: status.isPlaying,
    transport,
  };
};
