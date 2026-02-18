/**
 * @file useSpeechRecognition.ts
 * @description Speech recognition hook wrapper.
 * @module hooks/useSpeechRecognition
 *

 */

import { useEffect, useRef, useState } from 'react';
import { SPEECH } from '../constants';

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const getSpeechRecognition = () => {
  const windowAny = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return windowAny.SpeechRecognition ?? windowAny.webkitSpeechRecognition ?? null;
};

export const useSpeechRecognition = ({
  onStart,
  onEnd,
  onInterim,
  onFinal,
  onError,
}: {
  onStart?: () => void;
  onEnd?: () => void;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (errorCode?: string) => void;
}) => {
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return Boolean(getSpeechRecognition());
  });
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const callbacksRef = useRef({ onStart, onEnd, onInterim, onFinal, onError });

  useEffect(() => {
    callbacksRef.current = { onStart, onEnd, onInterim, onFinal, onError };
  }, [onStart, onEnd, onInterim, onFinal, onError]);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH.LANGUAGE;
    recognition.interimResults = SPEECH.INTERIM_RESULTS;
    recognition.continuous = SPEECH.CONTINUOUS;
    recognition.maxAlternatives = SPEECH.MAX_ALTERNATIVES;

    recognition.onstart = () => {
      setIsListening(true);
      callbacksRef.current.onStart?.();
    };

    recognition.onend = () => {
      setIsListening(false);
      callbacksRef.current.onEnd?.();
    };

    recognition.onerror = (event) => {
      callbacksRef.current.onError?.(event?.error);
    };

    recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      const transcript = result?.[0]?.transcript || '';
      if (!transcript) {
        return;
      }

      if (result.isFinal) {
        callbacksRef.current.onFinal?.(transcript);
        return;
      }

      callbacksRef.current.onInterim?.(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.abort?.();
      recognitionRef.current = null;
    };
  }, []);

  const start = () => recognitionRef.current?.start();
  const stop = () => recognitionRef.current?.stop();
  const abort = () => recognitionRef.current?.abort?.();

  return {
    isSupported,
    isListening,
    start,
    stop,
    abort,
  };
};
