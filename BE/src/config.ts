/**
 * @file config.ts
 * @description Environment config loader and validator.
 * @module config
 *
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { BOOL, DEFAULTS, DELIMITERS, ENV_KEYS, ERRORS, RAG } from './constants';

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

const parseIceServers = (value?: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    return DEFAULTS.WEBRTC_ICE_SERVERS;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall through to comma-delimited parsing.
  }
  const urls = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!urls.length) {
    return DEFAULTS.WEBRTC_ICE_SERVERS;
  }
  return [{ urls: urls.length === 1 ? urls[0] : urls }];
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
const useWebSearchTools = normalizeBoolean(readEnv(ENV_KEYS.USE_TOOLS));
const useRag = normalizeBoolean(readEnv(ENV_KEYS.USE_RAG));
const useRealtime = normalizeBoolean(readEnv(ENV_KEYS.USE_REALTIME));
const agentDebugLogs = normalizeBoolean(readEnv(ENV_KEYS.AGENT_DEBUG_LOGS));
const toolsEnabled = useWebSearchTools || useRag;
const requiresOpenAiStandard = !useLocalLlm;
const requiresOpenAiRealtime = useRealtime;
const requiresOpenAiKey = requiresOpenAiStandard || requiresOpenAiRealtime;
const propertiesPathValue = readEnv(ENV_KEYS.PROPERTIES_DATA_PATH);
const propertiesDataPath =
  typeof propertiesPathValue === 'string' && propertiesPathValue.trim()
    ? propertiesPathValue
    : resolve(process.cwd(), RAG.PROPERTIES_DEFAULT_PATH);

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
  ...(useWebSearchTools
    ? [ENV_KEYS.BRAVE_API_KEY, ENV_KEYS.BRAVE_BASE_URL]
    : []),
]);

const portValue = Number(env[ENV_KEYS.PORT]);
const braveResultCount = readNumber(readEnv(ENV_KEYS.BRAVE_RESULT_COUNT));
const webrtcIceServers = parseIceServers(readEnv(ENV_KEYS.WEBRTC_ICE_SERVERS));

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
    webSearchEnabled: useWebSearchTools,
    ragEnabled: useRag,
  },
  rag: {
    enabled: useRag,
    dataPath: propertiesDataPath,
  },
  webrtc: {
    iceServers: webrtcIceServers,
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
  brave: useWebSearchTools
    ? {
        apiKey: env[ENV_KEYS.BRAVE_API_KEY],
        baseUrl: env[ENV_KEYS.BRAVE_BASE_URL],
        resultCount: braveResultCount ?? DEFAULTS.BRAVE_RESULT_COUNT,
      }
    : null,
};

export type AppConfig = typeof config;
