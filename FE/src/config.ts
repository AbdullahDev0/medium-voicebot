/**
 * @file config.ts
 * @description Environment config loader and validator.
 * @module config
 *

 */

import { BOOL, DELIMITERS, ENV_KEYS, ERRORS } from './constants';

const readEnv = (key: string) => import.meta.env[key as keyof ImportMetaEnv];

const normalizeBoolean = (value?: string) =>
  typeof value === 'string' && value.toLowerCase() === BOOL.TRUE;

const requireEnv = (keys: string[]) => {
  const missing = keys.filter((key) => !readEnv(key));
  if (missing.length) {
    throw new Error(`${ERRORS.MISSING_ENV} ${missing.join(DELIMITERS.COMMA_SPACE)}`);
  }
  return keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = readEnv(key) as string;
    return acc;
  }, {});
};

const realtimeEnabled = normalizeBoolean(readEnv(ENV_KEYS.REALTIME_ENABLED));

const env = requireEnv([
  ENV_KEYS.API_BASE_URL,
  ...(realtimeEnabled ? [ENV_KEYS.REALTIME_WS_URL] : []),
]);

export const config = {
  api: {
    baseUrl: env[ENV_KEYS.API_BASE_URL],
  },
  realtime: {
    enabled: realtimeEnabled,
    wsUrl: realtimeEnabled ? env[ENV_KEYS.REALTIME_WS_URL] : '',
  },
};
