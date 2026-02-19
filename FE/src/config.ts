/**
 * @file config.ts
 * @description Environment config loader and validator.
 * @module config
 *

 */

import { DELIMITERS, ENV_KEYS, ERRORS } from './constants';

const readEnv = (key: string) => import.meta.env[key as keyof ImportMetaEnv];

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

const env = requireEnv([ENV_KEYS.API_BASE_URL]);

export const config = {
  api: {
    baseUrl: env[ENV_KEYS.API_BASE_URL],
  },
};
