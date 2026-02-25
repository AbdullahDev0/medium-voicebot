/**
 * @file audio.ts
 * @description Realtime audio encoding and decoding helpers.
 * @module utils/audio
 *
 */

import { REALTIME_AUDIO } from '../constants';

export const downsampleBuffer = (
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate: number
) => {
  if (inputSampleRate === targetSampleRate) {
    return input;
  }

  const ratio = inputSampleRate / targetSampleRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);
  let offsetBuffer = 0;

  for (let index = 0; index < outputLength; index += 1) {
    const nextOffsetBuffer = Math.round((index + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let inner = offsetBuffer; inner < nextOffsetBuffer && inner < input.length; inner += 1) {
      sum += input[inner];
      count += 1;
    }
    output[index] = count ? sum / count : 0;
    offsetBuffer = nextOffsetBuffer;
  }

  return output;
};

export const floatToPcm16 = (input: Float32Array) => {
  const output = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const value = Math.max(-1, Math.min(1, input[index]));
    output[index] =
      value < 0
        ? Math.max(Math.floor(value * REALTIME_AUDIO.INT16_MAX), REALTIME_AUDIO.INT16_MIN)
        : Math.min(Math.floor(value * REALTIME_AUDIO.INT16_MAX), REALTIME_AUDIO.INT16_MAX);
  }
  return output;
};

export const pcm16ToFloat = (input: Int16Array) => {
  const output = new Float32Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    output[index] = input[index] / REALTIME_AUDIO.INT16_MAX;
  }
  return output;
};

export const pcm16ToBase64 = (input: Int16Array) => {
  const bytes = new Uint8Array(input.buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return globalThis.btoa(binary);
};

export const base64ToPcm16 = (base64: string) => {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Int16Array(bytes.buffer);
};
