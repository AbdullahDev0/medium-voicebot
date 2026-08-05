/**
 * @file useWebrtcSession.ts
 * @description WebRTC realtime session hook.
 * @module hooks/useWebrtcSession
 *
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_PATHS, ERRORS, LOGS, REALTIME, REALTIME_TIMEOUTS, WEBRTC } from '../constants';
import { config } from '../config';

type TranscriptDeltaHandler = (id: string, text: string) => void;

type UseWebrtcSessionOptions = {
  onUserTranscriptDelta?: TranscriptDeltaHandler;
  onAssistantTranscriptDelta?: TranscriptDeltaHandler;
  onError?: (message: string) => void;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  usePropertyTools?: boolean;
};

type RealtimeEvent = Record<string, unknown> & { type?: string };

type SessionResponse = {
  sessionId: string;
  webrtcWsUrl: string;
  iceServers?: RTCIceServer[];
};

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

const getItemId = (event: RealtimeEvent) => {
  const itemId = event[REALTIME.ITEM_ID_KEY];
  if (typeof itemId === 'string' && itemId) {
    return itemId;
  }
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
};

export const useWebrtcSession = ({
  onUserTranscriptDelta,
  onAssistantTranscriptDelta,
  onError,
  onPlaybackStart,
  onPlaybackEnd,
  usePropertyTools,
}: UseWebrtcSessionOptions) => {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const signalingRef = useRef<WebSocket | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const isConnectingRef = useRef(false);
  const readyWaitersRef = useRef<Array<(ready: boolean) => void>>([]);
  const connectTimeoutRef = useRef<number | null>(null);
  const currentAssistantItemIdRef = useRef<string | null>(null);
  const mutedItemIdRef = useRef<string | null>(null);
  const isRecordingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const responseActiveRef = useRef(false);
  const playbackStartRef = useRef<number | null>(null);

  const callbacksRef = useRef({
    onUserTranscriptDelta,
    onAssistantTranscriptDelta,
    onError,
    onPlaybackStart,
    onPlaybackEnd,
  });

  useEffect(() => {
    callbacksRef.current = {
      onUserTranscriptDelta,
      onAssistantTranscriptDelta,
      onError,
      onPlaybackStart,
      onPlaybackEnd,
    };
  }, [onUserTranscriptDelta, onAssistantTranscriptDelta, onError, onPlaybackStart, onPlaybackEnd]);

  const logDebug = useCallback((message: string) => {
    if (config.logging.debug) {
      console.log(message);
    }
  }, []);

  const logEvent = useCallback(
    (prefix: string, eventType?: string) => {
      if (!eventType) {
        return;
      }
      logDebug(`${prefix}${eventType}`);
    },
    [logDebug],
  );

  const logTranscript = useCallback(
    (prefix: string, text: string) => {
      if (!text) {
        return;
      }
      logDebug(`${prefix}${text}`);
    },
    [logDebug],
  );

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const resolveWaiters = useCallback((ready: boolean) => {
    readyWaitersRef.current.forEach((resolve) => resolve(ready));
    readyWaitersRef.current = [];
    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const getPlayedAudioMs = useCallback(() => {
    if (!playbackStartRef.current) {
      return null;
    }
    return Math.max(0, Math.floor(performance.now() - playbackStartRef.current));
  }, []);

  const stopPlayback = useCallback(async () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    playbackStartRef.current = null;
    callbacksRef.current.onPlaybackEnd?.();
  }, []);

  const sendEvent = useCallback(
    (event: RealtimeEvent) => {
      const channel = dataChannelRef.current;
      if (!channel || channel.readyState !== 'open') {
        return false;
      }
      const eventType = event[REALTIME.TYPE_KEY];
      if (typeof eventType === 'string') {
        logEvent(LOGS.REALTIME_EVENT_OUT, eventType);
      }
      channel.send(JSON.stringify(event));
      return true;
    },
    [logEvent],
  );

  const handleBargeIn = useCallback(() => {
    const itemId = currentAssistantItemIdRef.current;
    if (itemId) {
      if (responseActiveRef.current) {
        sendEvent({ type: REALTIME.RESPONSE_CANCEL });
        responseActiveRef.current = false;
      }
      const playedMs = getPlayedAudioMs();
      if (playedMs !== null) {
        sendEvent({
          type: REALTIME.CONVERSATION_ITEM_TRUNCATE,
          item_id: itemId,
          content_index: 0,
          audio_end_ms: playedMs,
        });
      }
      mutedItemIdRef.current = itemId;
    }
    void stopPlayback();
  }, [getPlayedAudioMs, sendEvent, stopPlayback]);

  const stopCapture = useCallback(async () => {
    if (captureStreamRef.current) {
      captureStreamRef.current.getTracks().forEach((track) => track.stop());
      captureStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'audio') {
          peerRef.current?.removeTrack(sender);
        }
      });
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) {
      return;
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    await stopCapture();
    const committed = sendEvent({ type: REALTIME.INPUT_AUDIO_COMMIT });
    const responded = sendEvent({ type: REALTIME.RESPONSE_CREATE });
    if (!committed || !responded) {
      callbacksRef.current.onError?.(ERRORS.REALTIME_SESSION_FAILED);
    }
  }, [sendEvent, stopCapture]);

  const createSession = useCallback(async () => {
    const response = await fetch(`${config.api.baseUrl}${API_PATHS.VOICE_SESSION}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usePropertyTools: Boolean(usePropertyTools) }),
    });
    if (!response.ok) {
      throw new Error(ERRORS.REALTIME_SESSION_FAILED);
    }
    return (await response.json()) as SessionResponse;
  }, [usePropertyTools]);

  const connect = useCallback(async () => {
    if (!config.realtime.enabled) {
      const message = ERRORS.REALTIME_DISABLED;
      logDebug(LOGS.REALTIME_DISABLED);
      callbacksRef.current.onError?.(message);
      return false;
    }
    if (typeof RTCPeerConnection === 'undefined') {
      callbacksRef.current.onError?.(ERRORS.WEBRTC_UNSUPPORTED);
      return false;
    }
    if (isConnected) {
      return true;
    }
    if (peerRef.current || isConnectingRef.current) {
      return new Promise<boolean>((resolve) => {
        readyWaitersRef.current.push(resolve);
      });
    }

    setIsConnecting(true);
    isConnectingRef.current = true;
    logDebug(LOGS.WEBRTC_CONNECTING);

    try {
      const session = await createSession();
      const signaling = new WebSocket(session.webrtcWsUrl);
      signalingRef.current = signaling;

      const pc = new RTCPeerConnection({
        iceServers: session.iceServers,
      });
      peerRef.current = pc;

      const audioElement = new Audio();
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      remoteAudioRef.current = audioElement;

      const controlChannel = pc.createDataChannel('control');
      dataChannelRef.current = controlChannel;

      controlChannel.onopen = () => {
        logDebug(LOGS.WEBRTC_DATA_OPEN);
      };
      controlChannel.onclose = () => {
        logDebug(LOGS.WEBRTC_DATA_CLOSE);
      };
      controlChannel.onmessage = (event) => {
        const payload = typeof event.data === 'string' ? event.data : '';
        const parsed = parseEvent(payload);
        if (!parsed) {
          return;
        }
        const type = parsed[REALTIME.TYPE_KEY];
        if (typeof type === 'string') {
          logEvent(LOGS.REALTIME_EVENT_IN, type);
        } else {
          logDebug(LOGS.REALTIME_EVENT_UNPARSED);
        }
        if (type === REALTIME.RESPONSE_CREATED) {
          responseActiveRef.current = true;
        }
        if (type === REALTIME.RESPONSE_DONE) {
          responseActiveRef.current = false;
        }
        if (type === REALTIME.READY) {
          setIsConnecting(false);
          isConnectingRef.current = false;
          setIsConnected(true);
          resolveWaiters(true);
          return;
        }
        if (type === REALTIME.CLOSED) {
          setIsConnecting(false);
          isConnectingRef.current = false;
          setIsConnected(false);
          resolveWaiters(false);
          responseActiveRef.current = false;
          return;
        }
        if (type === REALTIME.ERROR) {
          const messageValue = parsed[REALTIME.MESSAGE_KEY];
          const message =
            typeof messageValue === 'string'
              ? messageValue
              : ERRORS.REALTIME_STREAM_FAILED;
          callbacksRef.current.onError?.(message);
          setIsConnecting(false);
          isConnectingRef.current = false;
          resolveWaiters(false);
          responseActiveRef.current = false;
          return;
        }
        if (type === REALTIME.INPUT_AUDIO_SPEECH_STARTED) {
          handleBargeIn();
          return;
        }
        if (type === REALTIME.INPUT_AUDIO_SPEECH_STOPPED) {
          if (!isRecordingRef.current) {
            return;
          }
          const responded = sendEvent({ type: REALTIME.RESPONSE_CREATE });
          if (responded) {
            return;
          }
        }
        if (type === WEBRTC.ASSISTANT_SPEAKING) {
          const speaking = parsed.speaking === true;
          if (speaking && !isPlayingRef.current) {
            isPlayingRef.current = true;
            setIsPlaying(true);
            playbackStartRef.current = performance.now();
            callbacksRef.current.onPlaybackStart?.();
          }
          if (!speaking && isPlayingRef.current) {
            void stopPlayback();
          }
          return;
        }
        if (type === WEBRTC.PLAYBACK_DONE) {
          void stopPlayback();
          return;
        }
        if (type === REALTIME.OUTPUT_AUDIO_TRANSCRIPT_DELTA) {
          const text = getTextValue(parsed);
          if (text) {
            const id = getItemId(parsed);
            currentAssistantItemIdRef.current = id;
            if (mutedItemIdRef.current && id === mutedItemIdRef.current) {
              return;
            }
            if (mutedItemIdRef.current && id !== mutedItemIdRef.current) {
              mutedItemIdRef.current = null;
            }
            callbacksRef.current.onAssistantTranscriptDelta?.(id, text);
            logTranscript(LOGS.REALTIME_TRANSCRIPT_OUT, text);
          }
          return;
        }
        if (type === REALTIME.INPUT_AUDIO_TRANSCRIPT_DELTA) {
          const text = getTextValue(parsed);
          if (text) {
            callbacksRef.current.onUserTranscriptDelta?.(getItemId(parsed), text);
            logTranscript(LOGS.REALTIME_TRANSCRIPT_IN, text);
          }
          return;
        }
        if (type === REALTIME.INPUT_AUDIO_TRANSCRIPT_FAILED) {
          callbacksRef.current.onError?.(ERRORS.STT_FAILED);
        }
      };

      pc.ontrack = (event) => {
        if (!remoteAudioRef.current) {
          return;
        }
        const stream = new MediaStream();
        stream.addTrack(event.track);
        remoteAudioRef.current.srcObject = stream;
        void remoteAudioRef.current.play().catch(() => undefined);
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate || signaling.readyState !== WebSocket.OPEN) {
          return;
        }
        signaling.send(
          JSON.stringify({ type: WEBRTC.SIGNALING_ICE, candidate: event.candidate })
        );
      };

      signaling.onopen = async () => {
        logDebug(LOGS.WEBRTC_SIGNALING_OPEN);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signaling.send(JSON.stringify({ type: WEBRTC.SIGNALING_OFFER, sdp: offer.sdp }));
      };

      signaling.onmessage = async (event) => {
        const payload = typeof event.data === 'string' ? event.data : '';
        const parsed = parseEvent(payload);
        if (!parsed) {
          return;
        }
        const type = parsed.type;
        if (type === WEBRTC.SIGNALING_ANSWER && typeof parsed.sdp === 'string') {
          await pc.setRemoteDescription({ type: 'answer', sdp: parsed.sdp });
          return;
        }
        if (type === WEBRTC.SIGNALING_ICE && parsed.candidate) {
          try {
            await pc.addIceCandidate(parsed.candidate as RTCIceCandidateInit);
          } catch {
            // ignore
          }
          return;
        }
        if (type === WEBRTC.SIGNALING_ERROR) {
          callbacksRef.current.onError?.(ERRORS.REALTIME_SESSION_FAILED);
          resolveWaiters(false);
        }
      };

      signaling.onerror = () => {
        logDebug(LOGS.WEBRTC_SIGNALING_ERROR);
        setIsConnecting(false);
        isConnectingRef.current = false;
        resolveWaiters(false);
      };

      signaling.onclose = () => {
        logDebug(LOGS.WEBRTC_SIGNALING_CLOSE);
        setIsConnecting(false);
        isConnectingRef.current = false;
        resolveWaiters(false);
      };

      connectTimeoutRef.current = window.setTimeout(() => {
        setIsConnecting(false);
        isConnectingRef.current = false;
        resolveWaiters(false);
        if (signaling.readyState === WebSocket.OPEN) {
          signaling.close();
        }
      }, REALTIME_TIMEOUTS.CONNECT_MS);

      return new Promise<boolean>((resolve) => {
        readyWaitersRef.current.push(resolve);
      });
    } catch {
      setIsConnecting(false);
      isConnectingRef.current = false;
      callbacksRef.current.onError?.(ERRORS.REALTIME_SESSION_FAILED);
      return false;
    }
  }, [createSession, handleBargeIn, isConnected, logDebug, logEvent, logTranscript, resolveWaiters, sendEvent, stopPlayback]);

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
    if (responseActiveRef.current) {
      sendEvent({ type: REALTIME.RESPONSE_CANCEL });
      responseActiveRef.current = false;
    }
    const cleared = sendEvent({ type: REALTIME.INPUT_AUDIO_CLEAR });
    if (!cleared) {
      const message = ERRORS.REALTIME_SESSION_FAILED;
      callbacksRef.current.onError?.(message);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const peer = peerRef.current;
      if (!peer) {
        throw new Error('Peer not ready');
      }
      stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));
      captureStreamRef.current = stream;
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
    isRecordingRef.current = false;
    setIsRecording(false);
    await stopCapture();
    await stopPlayback();
    if (responseActiveRef.current) {
      sendEvent({ type: REALTIME.RESPONSE_CANCEL });
      responseActiveRef.current = false;
    }
    sendEvent({ type: REALTIME.INPUT_AUDIO_CLEAR });
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (signalingRef.current) {
      signalingRef.current.close();
      signalingRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    isConnectingRef.current = false;
    resolveWaiters(false);
  }, [resolveWaiters, sendEvent, stopCapture, stopPlayback]);

  const disconnect = useCallback(async () => {
    await stopSession();
  }, [stopSession]);

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
    isSupported: typeof RTCPeerConnection !== 'undefined',
  };
};
