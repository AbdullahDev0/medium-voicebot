/**
 * @file useTextToSpeech.ts
 * @description Text-to-speech hook wrapper.
 * @module hooks/useTextToSpeech
 *

 */

import { useRef, useState } from 'react';
import { TTS } from '../constants';

export const useTextToSpeech = () => {
  const [isSupported] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.speechSynthesis) &&
      Boolean(window.SpeechSynthesisUtterance)
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cancel = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speak = (text: string) => new Promise<void>((resolve, reject) => {
    if (!isSupported) {
      resolve();
      return;
    }

    cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = TTS.LANGUAGE;
    utterance.rate = TTS.RATE;
    utterance.pitch = TTS.PITCH;
    utterance.volume = TTS.VOLUME;

    utterance.onend = () => {
      setIsSpeaking(false);
      resolve();
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      reject(event);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  });

  return {
    isSupported,
    isSpeaking,
    speak,
    cancel,
  };
};
