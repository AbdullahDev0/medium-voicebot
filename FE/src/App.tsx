/**
 * @file App.tsx
 * @description Voicebot Console single-page interface.
 * @module App
 *

 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APP,
  ARIA,
  ERRORS,
  LIMITS,
  MODES,
  PROPERTIES_MODES,
  ROLES,
  SPEECH_ERRORS,
  STATE_LABELS,
  STATES,
  THEME,
  UI,
} from './constants';
import { config } from './config';
import { ControlBar } from './components/ControlBar';
import { ModeToggle } from './components/ModeToggle';
import { PropertiesModeToggle } from './components/PropertiesModeToggle';
import { ResponsePanel } from './components/ResponsePanel';
import { StateMachine } from './components/StateMachine';
import { ThemeToggle } from './components/ThemeToggle';
import { TranscriptTimeline } from './components/TranscriptTimeline';
import { VoiceOrb } from './components/VoiceOrb';
import { Waveform } from './components/Waveform';
import { useMicrophoneLevel } from './hooks/useMicrophoneLevel';
import { useVoiceSession } from './hooks/useVoiceSession';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { requestAssistantResponse } from './services/llm';
import { formatTime } from './utils/time';
import type {
  ModeOption,
  PropertiesModeOption,
  Role,
  TranscriptItem,
  ThemeOption,
  VoiceState,
} from './types';

const createTranscriptItem = (role: Role, text: string): TranscriptItem => ({
  id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
  role,
  text,
  time: formatTime(new Date()),
});

const normalizeInput = (text: string) => text.trim().slice(0, LIMITS.MAX_INPUT_LENGTH);

export const App = () => {
  const [status, setStatus] = useState<VoiceState>(STATES.IDLE);
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<ModeOption>(MODES.NORMAL);
  const [propertiesMode, setPropertiesMode] = useState<PropertiesModeOption>(
    PROPERTIES_MODES.CHAT,
  );
  const [theme, setTheme] = useState<ThemeOption>(() => {
    if (typeof window === 'undefined') {
      return THEME.LIGHT;
    }
    const stored = window.localStorage?.getItem(THEME.STORAGE_KEY);
    if (stored === THEME.LIGHT || stored === THEME.DARK) {
      return stored as ThemeOption;
    }
    const prefersDark = window.matchMedia?.(THEME.MEDIA_QUERY_DARK)?.matches;
    return prefersDark ? THEME.DARK : THEME.LIGHT;
  });

  const { level, start: startMeter, stop: stopMeter, isActive: meterActive } = useMicrophoneLevel();
  const { isSupported: ttsSupported, speak } = useTextToSpeech();

  const upsertTranscriptDelta = useCallback((id: string, role: Role, delta: string) => {
    setTranscriptItems((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        const next = [
          ...items,
          {
            id,
            role,
            text: delta,
            time: formatTime(new Date()),
          },
        ];
        if (next.length <= LIMITS.MAX_TRANSCRIPTS) {
          return next;
        }
        return next.slice(next.length - LIMITS.MAX_TRANSCRIPTS);
      }
      const next = [...items];
      next[index] = { ...next[index], text: `${next[index].text}${delta}` };
      return next;
    });
  }, []);

  const handleRealtimeError = useCallback((message: string) => {
    setErrorMessage(message);
    setStatus(STATES.ERROR);
  }, []);

  const isPropertiesMode = mode === MODES.PROPERTIES;
  const isPropertiesRealtime =
    isPropertiesMode && propertiesMode === PROPERTIES_MODES.REALTIME;
  const realtimeWsUrl = isPropertiesRealtime
    ? config.realtime.propertiesWsUrl
    : config.realtime.wsUrl;

  const realtimeSession = useVoiceSession({
    onUserTranscriptDelta: (id, text) => {
      upsertTranscriptDelta(id, ROLES.USER, text);
    },
    onAssistantTranscriptDelta: (id, text) => {
      upsertTranscriptDelta(id, ROLES.ASSISTANT, text);
      setLastResponse((current) => `${current}${text}`);
    },
    onError: handleRealtimeError,
    onPlaybackStart: () => setStatus(STATES.SPEAKING),
    onPlaybackEnd: () => setStatus(STATES.IDLE),
    wsUrl: realtimeWsUrl,
    usePropertyTools: isPropertiesRealtime,
  });
  const {
    disconnect: disconnectRealtime,
    startRecording: startRealtimeRecording,
    stopRecording: stopRealtimeRecording,
    stopPlayback: stopRealtimePlayback,
    stopSession: stopRealtimeSession,
    isConnected: isRealtimeConnected,
    isRecording: isRealtimeRecording,
    isPlaying: isRealtimePlaying,
  } = realtimeSession;

  const appendTranscript = useCallback((role: Role, text: string) => {
    setTranscriptItems((items) => {
      const next = [...items, createTranscriptItem(role, text)];
      if (next.length <= LIMITS.MAX_TRANSCRIPTS) {
        return next;
      }
      return next.slice(next.length - LIMITS.MAX_TRANSCRIPTS);
    });
  }, []);

  const handleSpeechError = useCallback(
    (errorCode?: string) => {
      const isPermissionError =
        errorCode === SPEECH_ERRORS.NOT_ALLOWED ||
        errorCode === SPEECH_ERRORS.SERVICE_NOT_ALLOWED;
      setErrorMessage(isPermissionError ? ERRORS.MIC_DENIED : ERRORS.STT_FAILED);
      setStatus(STATES.ERROR);
      stopMeter();
    },
    [stopMeter]
  );

  const handleFinalTranscript = useCallback(
    async (text: string) => {
      const normalized = normalizeInput(text);
      if (!normalized) {
        return;
      }
      setInputText(normalized);
      await stopMeter();
      setStatus(STATES.THINKING);
      appendTranscript(ROLES.USER, normalized);

      try {
        const responseText = await requestAssistantResponse({
          input: normalized,
          mode,
        });
        setLastResponse(responseText);
        appendTranscript(ROLES.ASSISTANT, responseText);

        if (ttsSupported) {
          setStatus(STATES.SPEAKING);
          await speak(responseText);
        }

        setStatus(STATES.IDLE);
        setInputText('');
      } catch (error) {
        setStatus(STATES.ERROR);
        setErrorMessage((error as Error)?.message || ERRORS.LLM_FAILED);
      }
    },
    [appendTranscript, mode, speak, stopMeter, ttsSupported]
  );

  const handleInterimTranscript = useCallback((text: string) => {
    setInputText(text);
  }, []);

  const handleSpeechEnd = useCallback(() => {
    stopMeter();
    setStatus((current) => (current === STATES.LISTENING ? STATES.IDLE : current));
  }, [stopMeter]);

  const {
    isSupported: sttSupported,
    isListening,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition({
    onStart: () => setStatus(STATES.LISTENING),
    onEnd: handleSpeechEnd,
    onInterim: handleInterimTranscript,
    onFinal: handleFinalTranscript,
    onError: handleSpeechError,
  });

  const isRealtimeMode = mode === MODES.REALTIME || isPropertiesRealtime;
  const isBusy = status === STATES.THINKING || status === STATES.SPEAKING;
  const statusLabel = STATE_LABELS[status];

  const handleStart = useCallback(async () => {
    if (isRealtimeMode) {
      setErrorMessage('');
      setStatus(STATES.LISTENING);
      const started = await startRealtimeRecording();
      if (!started) {
        setStatus(STATES.ERROR);
      }
      return;
    }

    if (!sttSupported) {
      setStatus(STATES.ERROR);
      setErrorMessage(ERRORS.STT_UNSUPPORTED);
      return;
    }

    setErrorMessage('');
    setStatus(STATES.LISTENING);

    try {
      await startMeter();
      startListening();
    } catch {
      setStatus(STATES.ERROR);
      setErrorMessage(ERRORS.MIC_UNAVAILABLE);
    }
  }, [isRealtimeMode, startListening, startMeter, startRealtimeRecording, sttSupported]);

  const handleStop = useCallback(async () => {
    if (isRealtimeMode) {
      await stopRealtimeRecording();
      setLastResponse('');
      setStatus(STATES.THINKING);
      return;
    }
    stopListening();
    await stopMeter();
    setStatus((current) => (current === STATES.LISTENING ? STATES.IDLE : current));
  }, [isRealtimeMode, stopListening, stopMeter, stopRealtimeRecording]);

  const handleToggleListening = useCallback(() => {
    const active = isRealtimeMode ? isRealtimeRecording : isListening;
    if (active) {
      handleStop();
      return;
    }
    handleStart();
  }, [handleStart, handleStop, isListening, isRealtimeMode, isRealtimeRecording]);

  const handleSend = useCallback(() => {
    if (isBusy) {
      return;
    }
    if (isRealtimeMode) {
      return;
    }
    handleFinalTranscript(inputText);
  }, [handleFinalTranscript, inputText, isBusy, isRealtimeMode]);

  const handleClear = useCallback(() => {
    handleStop();
    if (isRealtimeMode) {
      void stopRealtimePlayback();
    }
    setTranscriptItems([]);
    setLastResponse('');
    setInputText('');
    setErrorMessage('');
    setStatus(STATES.IDLE);
  }, [handleStop, isRealtimeMode, stopRealtimePlayback]);

  const handleStopSession = useCallback(() => {
    if (!isRealtimeMode) {
      return;
    }
    void stopRealtimeSession();
    setStatus(STATES.IDLE);
  }, [isRealtimeMode, stopRealtimeSession]);

  const stateBadge = useMemo(
    () => ({
      label: statusLabel,
      hint: UI.LISTENING_HINT,
    }),
    [statusLabel]
  );

  useEffect(() => {
    document.title = APP.TITLE;
  }, []);

  useEffect(() => {
    if (isRealtimeMode) {
      setInputText('');
    }
  }, [isRealtimeMode]);

  useEffect(() => {
    if (!isRealtimeMode) {
      disconnectRealtime();
      setStatus(STATES.IDLE);
    }
  }, [disconnectRealtime, isRealtimeMode]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(THEME.ATTR, theme);
    }
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(THEME.STORAGE_KEY, theme);
    }
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((current) => (current === THEME.DARK ? THEME.LIGHT : THEME.DARK));
  }, []);

  const inputPlaceholder = isRealtimeMode ? UI.REALTIME_INPUT_PLACEHOLDER : UI.INPUT_PLACEHOLDER;

  const listeningActive = isRealtimeMode ? isRealtimeRecording : isListening;
  const stopDisabled =
    !isRealtimeConnected && !isRealtimeRecording && !isRealtimePlaying;

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
              {APP.TAGLINE}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)] md:text-4xl">
              {APP.TITLE}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{APP.SUBTITLE}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
            <ModeToggle
              mode={mode}
              onChange={setMode}
              showRag={config.rag.enabled}
              showRealtime={config.realtime.enabled}
            />
            {mode === MODES.PROPERTIES ? (
              <PropertiesModeToggle
                mode={propertiesMode}
                onChange={setPropertiesMode}
                showRealtime={config.realtime.enabled}
              />
            ) : null}
            <div className="flex items-center gap-3 rounded-full border border-[var(--stroke)] bg-[var(--panel)] px-4 py-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {UI.STATUS_LABEL}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink)]">
                {stateBadge.label}
              </span>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--ink)]">
            <span className="font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {STATE_LABELS[STATES.ERROR]}
            </span>
            <p className="mt-2 text-sm leading-relaxed">{errorMessage}</p>
          </div>
        ) : null}

        <main className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-[var(--stroke)] bg-[var(--panel)] px-5 py-6 shadow-[0_30px_80px_rgba(0,0,0,0.12)] sm:px-6 sm:py-8">
              <div className="flex flex-col items-center gap-8">
                <VoiceOrb
                  isActive={listeningActive}
                  onClick={handleToggleListening}
                  disabled={isBusy}
                />
                <div className="flex flex-col items-center gap-3">
                  <Waveform level={level} isActive={meterActive} />
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    {stateBadge.hint}
                  </p>
                </div>
              </div>
            </div>

            <ControlBar
              value={inputText}
              onChange={setInputText}
              onSend={handleSend}
              onToggleListening={handleToggleListening}
              onStop={handleStopSession}
              onClear={handleClear}
              isListening={listeningActive}
              isBusy={isBusy}
              inputDisabled={isRealtimeMode}
              sendDisabled={isRealtimeMode}
              placeholder={inputPlaceholder}
              showStop={isRealtimeMode}
              stopDisabled={stopDisabled}
            />

            <ResponsePanel text={lastResponse} />
          </section>

          <aside className="flex flex-col gap-6">
            <StateMachine currentState={status} />
            <TranscriptTimeline items={transcriptItems} />
          </aside>
        </main>
      </div>
      <footer className="flex items-center justify-center gap-2 pb-6 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
        <span>{UI.POWERED_BY}</span>
        <span aria-label={ARIA.VOICE_ORB} className="h-1 w-1 rounded-full bg-[var(--muted)]" />
        <span>{statusLabel}</span>
      </footer>
    </div>
  );
};
