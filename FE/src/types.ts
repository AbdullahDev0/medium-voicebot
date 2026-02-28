/**
 * @file types.ts
 * @description Shared type definitions for the Voicebot Console frontend.
 * @module types
 *

 */

import { MODES, PROPERTIES_MODES, ROLES, STATES, THEME } from './constants';

export type Role = (typeof ROLES)[keyof typeof ROLES];

export type TranscriptItem = {
  id: string;
  role: Role;
  text: string;
  time: string;
};

export type VoiceState = (typeof STATES)[keyof typeof STATES];

export type ThemeOption = typeof THEME.LIGHT | typeof THEME.DARK;

export type ModeOption = (typeof MODES)[keyof typeof MODES];

export type PropertiesModeOption =
  (typeof PROPERTIES_MODES)[keyof typeof PROPERTIES_MODES];
