/**
 * @file Waveform.tsx
 * @description Audio waveform visualization.
 * @module components/Waveform
 *

 */

import { useMemo } from 'react';
import { ARIA, WAVEFORM } from '../constants';

type WaveformProps = {
  level: number;
  isActive: boolean;
};

const buildWeights = (): number[] =>
  Array.from({ length: WAVEFORM.BARS }, () => 0.4 + Math.random() * 0.6);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const Waveform = ({ level, isActive }: WaveformProps) => {
  const weights = useMemo(() => buildWeights(), []);
  const baseLevel = isActive ? level : 0;

  return (
    <div className="flex items-end justify-center gap-1" aria-label={ARIA.WAVEFORM}>
      {weights.map((weight, index) => {
        const height =
          WAVEFORM.MIN_HEIGHT +
          (WAVEFORM.MAX_HEIGHT - WAVEFORM.MIN_HEIGHT) * clamp(baseLevel * weight, 0, 1);
        return (
          <span
            key={`bar-${index}`}
            className="w-1 rounded-full bg-[var(--ink)] transition-all duration-200"
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
};
