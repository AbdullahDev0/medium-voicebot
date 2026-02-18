/**
 * @file useMicrophoneLevel.ts
 * @description Microphone level meter hook.
 * @module hooks/useMicrophoneLevel
 *

 */

import { useCallback, useRef, useState } from 'react';
import { AUDIO_METER } from '../constants';

export const useMicrophoneLevel = () => {
  const [level, setLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothLevelRef = useRef(0);

  const stop = useCallback(async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataRef.current = null;
    smoothLevelRef.current = 0;
    setLevel(0);
    setIsActive(false);
  }, []);

  const start = useCallback(async () => {
    await stop();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = AUDIO_METER.FFT_SIZE;
    analyser.smoothingTimeConstant = AUDIO_METER.SMOOTHING;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.fftSize;
    const data = new Uint8Array(bufferLength);

    streamRef.current = stream;
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataRef.current = data;
    setIsActive(true);

    const tick = () => {
      if (!analyserRef.current || !dataRef.current) {
        return;
      }

      analyserRef.current.getByteTimeDomainData(dataRef.current as Uint8Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < dataRef.current.length; i += 1) {
        const normalized = (dataRef.current[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataRef.current.length);
      const targetLevel = Math.min(Math.max(rms, AUDIO_METER.MIN_LEVEL), AUDIO_METER.MAX_LEVEL);
      const smoothed = smoothLevelRef.current +
        (targetLevel - smoothLevelRef.current) * (1 - AUDIO_METER.SMOOTHING);
      smoothLevelRef.current = smoothed;
      setLevel(Math.max(smoothed, AUDIO_METER.LEVEL_FLOOR));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stop]);

  return {
    level,
    isActive,
    start,
    stop,
  };
};
