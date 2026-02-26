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
  MODE_LABEL: 'Mode',
  MODE_NORMAL: 'Normal',
  MODE_AGENT: 'Agent',
  MODE_REALTIME: 'Realtime',
  MODE_HINT_NORMAL: 'Direct',
  MODE_HINT_AGENT: 'Web search',
  MODE_HINT_REALTIME: 'Voice',
  INPUT_LABEL: 'Message',
  INPUT_PLACEHOLDER: 'Speak or type a message',
  REALTIME_INPUT_PLACEHOLDER: 'Realtime voice uses the mic controls',
  SEND_LABEL: 'Send',
  CLEAR_LABEL: 'Clear',
  REALTIME_STOP_LABEL: 'Stop',
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
  REALTIME_STOP: 'Stop realtime session',
  INPUT_MESSAGE: 'Message input',
  WAVEFORM: 'Audio waveform',
  VOICE_ORB: 'Voice orb',
  THEME_TOGGLE: 'Toggle theme',
  MODE_TOGGLE: 'Toggle mode',
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

export const MODES = {
  NORMAL: 'normal',
  AGENT: 'agent',
  REALTIME: 'realtime',
};

export const MODE_LABELS = {
  [MODES.NORMAL]: UI.MODE_NORMAL,
  [MODES.AGENT]: UI.MODE_AGENT,
  [MODES.REALTIME]: UI.MODE_REALTIME,
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

export const API_PATHS = {
  LLM_RESPOND: '/api/llm/respond',
  LLM_AGENT: '/api/llm/agent',
  HEALTH: '/api/health',
};

export const API_REQUEST = {
  INPUT_KEY: 'input',
};

export const API_RESPONSE = {
  TEXT_KEY: 'text',
};

export const HTTP = {
  METHOD_POST: 'POST',
  HEADER_CONTENT_TYPE: 'Content-Type',
  CONTENT_TYPE_JSON: 'application/json',
};

export const ERRORS = {
  MIC_DENIED: 'Microphone access was denied.',
  MIC_UNAVAILABLE: 'Microphone access is unavailable.',
  STT_UNSUPPORTED: 'Speech recognition is not supported in this browser.',
  STT_FAILED: 'Speech recognition encountered an error.',
  LLM_FAILED: 'LLM request failed.',
  LLM_EMPTY: 'No response text was returned.',
  TTS_UNSUPPORTED: 'Text-to-speech is not supported in this browser.',
  REALTIME_DISABLED: 'Realtime voice is disabled.',
  REALTIME_CONNECTION_FAILED: 'Realtime connection failed.',
  REALTIME_SESSION_FAILED: 'Realtime session failed.',
  REALTIME_STREAM_FAILED: 'Realtime stream failed.',
  MISSING_ENV: 'Missing required environment variables:',
};

export const ENV_KEYS = {
  API_BASE_URL: 'VITE_API_BASE_URL',
  REALTIME_ENABLED: 'VITE_REALTIME_ENABLED',
  REALTIME_WS_URL: 'VITE_REALTIME_WS_URL',
};

export const DELIMITERS = {
  COMMA_SPACE: ', ',
};

export const BOOL = {
  TRUE: 'true',
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

export const REALTIME = {
  READY: 'realtime.ready',
  ERROR: 'realtime.error',
  CLOSED: 'realtime.closed',
  TYPE_KEY: 'type',
  MESSAGE_KEY: 'message',
  CODE_KEY: 'code',
  AUDIO_KEY: 'audio',
  ITEM_ID_KEY: 'item_id',
  RESPONSE_ID_KEY: 'response_id',
  DELTA_KEY: 'delta',
  TRANSCRIPT_KEY: 'transcript',
  INPUT_AUDIO_CLEAR: 'input_audio_buffer.clear',
  INPUT_AUDIO_APPEND: 'input_audio_buffer.append',
  INPUT_AUDIO_COMMIT: 'input_audio_buffer.commit',
  INPUT_AUDIO_SPEECH_STARTED: 'input_audio_buffer.speech_started',
  INPUT_AUDIO_SPEECH_STOPPED: 'input_audio_buffer.speech_stopped',
  RESPONSE_CREATE: 'response.create',
  RESPONSE_CANCEL: 'response.cancel',
  CONVERSATION_ITEM_TRUNCATE: 'conversation.item.truncate',
  OUTPUT_AUDIO_DELTA: 'response.output_audio.delta',
  OUTPUT_AUDIO_DONE: 'response.output_audio.done',
  OUTPUT_AUDIO_TRANSCRIPT_DELTA: 'response.output_audio_transcript.delta',
  OUTPUT_AUDIO_TRANSCRIPT_DONE: 'response.output_audio_transcript.done',
  INPUT_AUDIO_TRANSCRIPT_DELTA: 'conversation.item.input_audio_transcription.delta',
  INPUT_AUDIO_TRANSCRIPT_FAILED: 'conversation.item.input_audio_transcription.failed',
};

export const REALTIME_AUDIO = {
  TARGET_SAMPLE_RATE: 24000,
  CHANNELS: 1,
  BUFFER_SIZE: 4096,
  INT16_MAX: 32767,
  INT16_MIN: -32768,
};

export const REALTIME_TIMEOUTS = {
  CONNECT_MS: 8000,
};
