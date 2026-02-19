/**
 * @file config.ts
 * @description Environment config loader and validator.
 * @module config
 *
 */

import { config as loadEnv } from 'dotenv';
import { BOOL, DELIMITERS, ENV_KEYS, ERRORS } from './constants';

loadEnv();

const readEnv = (key: string) => process.env[key];

const normalizeBoolean = (value?: string) =>
  typeof value === 'string' && value.toLowerCase() === BOOL.TRUE;

const requireEnv = (keys: string[]) => {
  const missing = keys.filter((key) => !readEnv(key));
  if (missing.length) {
    throw new Error(
      `${ERRORS.MISSING_ENV} ${missing.join(DELIMITERS.COMMA_SPACE)}`,
    );
  }
  return keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = readEnv(key) as string;
    return acc;
  }, {});
};

const useLocalLlm = normalizeBoolean(readEnv(ENV_KEYS.USE_LOCAL_LLM));

const env = requireEnv([
  ENV_KEYS.PORT,
  ENV_KEYS.CORS_ORIGIN,
  ...(useLocalLlm
    ? [ENV_KEYS.OLLAMA_BASE_URL, ENV_KEYS.OLLAMA_MODEL]
    : [
        ENV_KEYS.OPENAI_API_KEY,
        ENV_KEYS.OPENAI_MODEL,
        ENV_KEYS.OPENAI_BASE_URL,
      ]),
]);

const portValue = Number(env[ENV_KEYS.PORT]);

if (!Number.isFinite(portValue)) {
  throw new Error(ERRORS.INVALID_PORT);
}

export const config = {
  server: {
    port: portValue,
  },
  cors: {
    origin: env[ENV_KEYS.CORS_ORIGIN],
  },
  llm: {
    useLocal: useLocalLlm,
  },
  openai: useLocalLlm
    ? null
    : {
        apiKey: env[ENV_KEYS.OPENAI_API_KEY],
        model: env[ENV_KEYS.OPENAI_MODEL],
        baseUrl: env[ENV_KEYS.OPENAI_BASE_URL],
      },
  ollama: useLocalLlm
    ? {
        baseUrl: env[ENV_KEYS.OLLAMA_BASE_URL],
        model: env[ENV_KEYS.OLLAMA_MODEL],
      }
    : null,
};

export type AppConfig = typeof config;
