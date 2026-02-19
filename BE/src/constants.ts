/**
 * @file constants.ts
 * @description Global constants for the Voicebot Console backend.
 * @module constants
 *
 */

export const API = {
  PREFIX: 'api',
  HEALTH: 'health',
  LLM: 'llm',
  RESPOND: 'respond',
  REQUEST_INPUT_KEY: 'input',
  RESPONSE_TEXT_KEY: 'text',
  RESPONSE_STATUS_KEY: 'status',
};

export const ENV_KEYS = {
  PORT: 'PORT',
  CORS_ORIGIN: 'CORS_ORIGIN',
  USE_LOCAL_LLM: 'USE_LOCAL_LLM',
  OLLAMA_BASE_URL: 'OLLAMA_BASE_URL',
  OLLAMA_MODEL: 'OLLAMA_MODEL',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  OPENAI_MODEL: 'OPENAI_MODEL',
  OPENAI_BASE_URL: 'OPENAI_BASE_URL',
};

export const ERRORS = {
  MISSING_ENV: 'Missing required environment variables:',
  INVALID_PORT: 'Invalid port value.',
  LLM_FAILED: 'LLM request failed.',
  LLM_EMPTY: 'No response text was returned.',
};

export const DELIMITERS = {
  COMMA_SPACE: ', ',
};

export const HTTP = {
  METHOD_POST: 'POST',
  METHOD_GET: 'GET',
  HEADER_AUTH: 'Authorization',
  HEADER_CONTENT_TYPE: 'Content-Type',
  CONTENT_TYPE_JSON: 'application/json',
  BEARER_PREFIX: 'Bearer ',
};

export const BOOL = {
  TRUE: 'true',
};

export const OPENAI = {
  RESPONSES_PATH: '/responses',
  MODEL_KEY: 'model',
  INPUT_KEY: 'input',
  STORE_KEY: 'store',
  STORE_VALUE: false,
  OUTPUT_TEXT_PROPERTY: 'output_text',
  OUTPUT_KEY: 'output',
  OUTPUT_MESSAGE_TYPE: 'message',
  OUTPUT_TEXT_TYPE: 'output_text',
};

export const OLLAMA = {
  GENERATE_PATH: '/api/generate',
  MODEL_KEY: 'model',
  PROMPT_KEY: 'prompt',
  STREAM_KEY: 'stream',
  STREAM_VALUE: false,
  RESPONSE_TEXT_KEY: 'response',
};
