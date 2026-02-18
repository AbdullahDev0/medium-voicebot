/**
 * @file constants.ts
 * @description Global constants for the Voicebot Console frontend.
 * @module constants
 *

 */

export const APP = {
  TITLE: 'Voicebot Console',
  SUBTITLE: 'Voice-first single-page console',
  TAGLINE: 'Capture, transcribe, respond, and speak',
};

export const UI = {
  CONSOLE_TITLE: 'Console',
  TRANSCRIPT_TITLE: 'Transcript Timeline',
  STATE_MACHINE_TITLE: 'State Machine',
  RESPONSE_TITLE: 'Assistant Response',
  STATUS_LABEL: 'Status',
  THEME_LABEL: 'Theme',
  THEME_LIGHT: 'Light',
  THEME_DARK: 'Dark',
  INPUT_LABEL: 'Message',
  INPUT_PLACEHOLDER: 'Speak or type a message',
  SEND_LABEL: 'Send',
  CLEAR_LABEL: 'Clear',
  RETRY_LABEL: 'Retry',
  EMPTY_TRANSCRIPT: 'No transcripts yet.',
  EMPTY_RESPONSE: 'No response yet.',
  POWERED_BY: 'OpenAI',
  LISTENING_HINT: 'Press the orb or mic to start',
};

export const ARIA = {
  TOGGLE_MIC: 'Toggle microphone',
  SEND_MESSAGE: 'Send message',
  CLEAR_TRANSCRIPT: 'Clear transcript',
  INPUT_MESSAGE: 'Message input',
  WAVEFORM: 'Audio waveform',
  VOICE_ORB: 'Voice orb',
  THEME_TOGGLE: 'Toggle theme',
};

export const IDS = {
  INPUT_MESSAGE: 'message-input',
};

export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
  STORAGE_KEY: 'voicebot.theme',
  ATTR: 'data-theme',
  MEDIA_QUERY_DARK: '(prefers-color-scheme: dark)',
};

export const STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  ERROR: 'error',
};

export const STATE_LABELS = {
  [STATES.IDLE]: 'Idle',
  [STATES.LISTENING]: 'Listening',
  [STATES.THINKING]: 'Thinking',
  [STATES.SPEAKING]: 'Speaking',
  [STATES.ERROR]: 'Error',
};

export const STATE_DESCRIPTIONS = {
  [STATES.IDLE]: 'Waiting for input',
  [STATES.LISTENING]: 'Capturing speech',
  [STATES.THINKING]: 'Generating response',
  [STATES.SPEAKING]: 'Playing audio reply',
  [STATES.ERROR]: 'Needs attention',
};

export const STATE_ORDER = [
  STATES.IDLE,
  STATES.LISTENING,
  STATES.THINKING,
  STATES.SPEAKING,
  STATES.ERROR,
];

export const ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
};

export const ROLE_LABELS = {
  [ROLES.USER]: 'You',
  [ROLES.ASSISTANT]: 'Assistant',
};

export const SPEECH = {
  LANGUAGE: 'en-US',
  INTERIM_RESULTS: true,
  CONTINUOUS: false,
  MAX_ALTERNATIVES: 1,
};

export const SPEECH_ERRORS = {
  NOT_ALLOWED: 'not-allowed',
  SERVICE_NOT_ALLOWED: 'service-not-allowed',
  NO_SPEECH: 'no-speech',
  AUDIO_CAPTURE: 'audio-capture',
  NETWORK: 'network',
  ABORTED: 'aborted',
};

export const TTS = {
  LANGUAGE: 'en-US',
  RATE: 1,
  PITCH: 1,
  VOLUME: 1,
};

export const AUDIO_METER = {
  FFT_SIZE: 1024,
  SMOOTHING: 0.8,
  MIN_LEVEL: 0,
  MAX_LEVEL: 1,
  LEVEL_FLOOR: 0.05,
};

export const WAVEFORM = {
  BARS: 24,
  MIN_HEIGHT: 6,
  MAX_HEIGHT: 28,
};

export const LLM = {
  PROVIDERS: {
    OPENAI: 'openai',
  },
  DEFAULT_PROVIDER: 'openai',
  MODEL_KEY: 'model',
  INPUT_KEY: 'input',
  STORE_KEY: 'store',
  STORE_VALUE: false,
  OUTPUT_KEY: 'output',
  OUTPUT_TEXT_PROPERTY: 'output_text',
  OUTPUT_MESSAGE_TYPE: 'message',
  OUTPUT_TEXT_TYPE: 'output_text',
};

export const API_PATHS = {
  OPENAI_RESPONSES: '/responses',
};

export const HTTP = {
  METHOD_POST: 'POST',
  HEADER_AUTH: 'Authorization',
  HEADER_CONTENT_TYPE: 'Content-Type',
  CONTENT_TYPE_JSON: 'application/json',
  BEARER_PREFIX: 'Bearer ',
};

export const ERRORS = {
  MIC_DENIED: 'Microphone access was denied.',
  MIC_UNAVAILABLE: 'Microphone access is unavailable.',
  STT_UNSUPPORTED: 'Speech recognition is not supported in this browser.',
  STT_FAILED: 'Speech recognition encountered an error.',
  LLM_FAILED: 'LLM request failed.',
  LLM_EMPTY: 'No response text was returned.',
  LLM_UNSUPPORTED: 'Selected LLM provider is not supported.',
  TTS_UNSUPPORTED: 'Text-to-speech is not supported in this browser.',
  MISSING_ENV: 'Missing required environment variables:',
};

export const ENV_KEYS = {
  OPENAI_API_KEY: 'VITE_OPENAI_API_KEY',
  OPENAI_MODEL: 'VITE_OPENAI_MODEL',
  OPENAI_BASE_URL: 'VITE_OPENAI_BASE_URL',
};

export const DELIMITERS = {
  COMMA_SPACE: ', ',
};

export const LIMITS = {
  MAX_TRANSCRIPTS: 200,
  MAX_INPUT_LENGTH: 4000,
};

export const TIME_FORMAT = {
  LOCALE: 'en-US',
  OPTIONS: {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  } as const,
};
