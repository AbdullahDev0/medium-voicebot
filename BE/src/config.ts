/**
 * @file config.ts
 * @description Environment config loader and validator.
 * @module config
 *
 */

import { config as loadEnv } from 'dotenv';
import { DELIMITERS, ENV_KEYS, ERRORS } from './constants';

loadEnv();

const readEnv = (key: string) => process.env[key];

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

const env = requireEnv([
  ENV_KEYS.PORT,
  ENV_KEYS.CORS_ORIGIN,
  ENV_KEYS.OPENAI_API_KEY,
  ENV_KEYS.OPENAI_MODEL,
  ENV_KEYS.OPENAI_BASE_URL,
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
  openai: {
    apiKey: env[ENV_KEYS.OPENAI_API_KEY],
    model: env[ENV_KEYS.OPENAI_MODEL],
    baseUrl: env[ENV_KEYS.OPENAI_BASE_URL],
  },
};

export type AppConfig = typeof config;
