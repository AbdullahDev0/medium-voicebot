/**
 * @file config.ts
 * @description Environment config loader and validator.
 * @module config
 *
 */

import { config as loadEnv } from 'dotenv';
import { BOOL, DEFAULTS, DELIMITERS, ENV_KEYS, ERRORS } from './constants';

loadEnv();

const readEnv = (key: string) => process.env[key];

const normalizeBoolean = (value?: string) =>
  typeof value === 'string' && value.toLowerCase() === BOOL.TRUE;

const readNumber = (value?: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  return Number(value);
};

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
const useTools = normalizeBoolean(readEnv(ENV_KEYS.USE_TOOLS));
const useRealtime = normalizeBoolean(readEnv(ENV_KEYS.USE_REALTIME));
const agentDebugLogs = normalizeBoolean(readEnv(ENV_KEYS.AGENT_DEBUG_LOGS));
const toolsEnabled = useTools;
const requiresOpenAiStandard = !useLocalLlm;
const requiresOpenAiRealtime = useRealtime;
const requiresOpenAiKey = requiresOpenAiStandard || requiresOpenAiRealtime;

const env = requireEnv([
  ENV_KEYS.PORT,
  ENV_KEYS.CORS_ORIGIN,
  ...(useLocalLlm ? [ENV_KEYS.OLLAMA_BASE_URL, ENV_KEYS.OLLAMA_MODEL] : []),
  ...(requiresOpenAiKey ? [ENV_KEYS.OPENAI_API_KEY] : []),
  ...(requiresOpenAiStandard
    ? [ENV_KEYS.OPENAI_MODEL, ENV_KEYS.OPENAI_BASE_URL]
    : []),
  ...(requiresOpenAiRealtime
    ? [
        ENV_KEYS.OPENAI_REALTIME_URL,
        ENV_KEYS.OPENAI_REALTIME_MODEL,
        ENV_KEYS.OPENAI_REALTIME_VOICE,
      ]
    : []),
  ...(toolsEnabled ? [ENV_KEYS.BRAVE_API_KEY, ENV_KEYS.BRAVE_BASE_URL] : []),
]);

const portValue = Number(env[ENV_KEYS.PORT]);
const braveResultCount = readNumber(readEnv(ENV_KEYS.BRAVE_RESULT_COUNT));

if (!Number.isFinite(portValue)) {
  throw new Error(ERRORS.INVALID_PORT);
}

if (
  typeof braveResultCount === 'number' &&
  !Number.isFinite(braveResultCount)
) {
  throw new Error(ERRORS.INVALID_NUMBER);
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
  realtime: {
    enabled: useRealtime,
    apiKey: requiresOpenAiKey ? env[ENV_KEYS.OPENAI_API_KEY] : '',
    url: requiresOpenAiRealtime ? env[ENV_KEYS.OPENAI_REALTIME_URL] : '',
    model: requiresOpenAiRealtime ? env[ENV_KEYS.OPENAI_REALTIME_MODEL] : '',
    voice: requiresOpenAiRealtime ? env[ENV_KEYS.OPENAI_REALTIME_VOICE] : '',
    transcriptionModel:
      readEnv(ENV_KEYS.OPENAI_REALTIME_TRANSCRIBE_MODEL) ?? '',
  },
  tools: {
    enabled: toolsEnabled,
  },
  logging: {
    agentDebug: agentDebugLogs,
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
  brave: toolsEnabled
    ? {
        apiKey: env[ENV_KEYS.BRAVE_API_KEY],
        baseUrl: env[ENV_KEYS.BRAVE_BASE_URL],
        resultCount: braveResultCount ?? DEFAULTS.BRAVE_RESULT_COUNT,
      }
    : null,
};

export type AppConfig = typeof config;
