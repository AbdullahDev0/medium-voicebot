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
  AGENT: 'agent',
  REQUEST_INPUT_KEY: 'input',
  RESPONSE_TEXT_KEY: 'text',
  RESPONSE_STATUS_KEY: 'status',
};

export const ENV_KEYS = {
  PORT: 'PORT',
  CORS_ORIGIN: 'CORS_ORIGIN',
  USE_LOCAL_LLM: 'USE_LOCAL_LLM',
  USE_TOOLS: 'USE_TOOLS',
  USE_REALTIME: 'USE_REALTIME',
  AGENT_DEBUG_LOGS: 'AGENT_DEBUG_LOGS',
  OLLAMA_BASE_URL: 'OLLAMA_BASE_URL',
  OLLAMA_MODEL: 'OLLAMA_MODEL',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  OPENAI_MODEL: 'OPENAI_MODEL',
  OPENAI_BASE_URL: 'OPENAI_BASE_URL',
  OPENAI_REALTIME_URL: 'OPENAI_REALTIME_URL',
  OPENAI_REALTIME_MODEL: 'OPENAI_REALTIME_MODEL',
  OPENAI_REALTIME_VOICE: 'OPENAI_REALTIME_VOICE',
  OPENAI_REALTIME_TRANSCRIBE_MODEL: 'OPENAI_REALTIME_TRANSCRIBE_MODEL',
  BRAVE_API_KEY: 'BRAVE_API_KEY',
  BRAVE_BASE_URL: 'BRAVE_BASE_URL',
  BRAVE_RESULT_COUNT: 'BRAVE_RESULT_COUNT',
};

export const ERRORS = {
  MISSING_ENV: 'Missing required environment variables:',
  INVALID_PORT: 'Invalid port value.',
  INVALID_NUMBER: 'Invalid numeric value.',
  LLM_FAILED: 'LLM request failed.',
  LLM_EMPTY: 'No response text was returned.',
  TOOL_INPUT_INVALID: 'Tool input is invalid.',
  TOOL_UNSUPPORTED: 'Tool is not supported.',
  SEARCH_FAILED: 'Search request failed.',
  TOOLS_DISABLED: 'Tooling is disabled.',
  AGENT_FAILED: 'Agent request failed.',
  AGENT_COERCED_NO_ANSWER: 'No usable answer was returned by the agent.',
  REALTIME_DISABLED: 'Realtime voice is disabled.',
  REALTIME_CONNECTION_FAILED: 'Realtime connection failed.',
  REALTIME_SESSION_FAILED: 'Realtime session failed.',
  REALTIME_CLIENT_INVALID: 'Realtime client event is invalid.',
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
  HEADER_ACCEPT: 'Accept',
  HEADER_ACCEPT_ENCODING: 'Accept-Encoding',
  ACCEPT_JSON: 'application/json',
  ACCEPT_ENCODING: 'gzip',
};

export const BOOL = {
  TRUE: 'true',
};

export const OPENAI = {
  RESPONSES_PATH: '/responses',
  MODEL_KEY: 'model',
  INPUT_KEY: 'input',
  STORE_KEY: 'store',
  STORE_DISABLED: false,
  STORE_ENABLED: true,
  OUTPUT_KEY: 'output',
  OUTPUT_TEXT_PROPERTY: 'output_text',
  OUTPUT_MESSAGE_TYPE: 'message',
  OUTPUT_TEXT_TYPE: 'output_text',
  TOOLS_KEY: 'tools',
  INSTRUCTIONS_KEY: 'instructions',
  PREVIOUS_RESPONSE_ID_KEY: 'previous_response_id',
  TOOL_TYPE_FUNCTION: 'function',
  OUTPUT_FUNCTION_CALL_TYPE: 'function_call',
  TOOL_CALL_OUTPUT_TYPE: 'function_call_output',
  TOOL_CALL_ID_KEY: 'call_id',
  TOOL_CALL_NAME_KEY: 'name',
  TOOL_CALL_ARGUMENTS_KEY: 'arguments',
  TOOL_OUTPUT_KEY: 'output',
  FUNCTION_NAME_KEY: 'name',
  FUNCTION_DESCRIPTION_KEY: 'description',
  FUNCTION_PARAMETERS_KEY: 'parameters',
  RESPONSE_ID_KEY: 'id',
};

export const REALTIME = {
  WS_PATH: '/ws/realtime',
  QUERY_MODEL_KEY: 'model',
  SESSION_TYPE: 'realtime',
  INPUT_FORMAT_PCM16: 'pcm16',
  OUTPUT_FORMAT_PCM16: 'pcm16',
  OUTPUT_MODALITIES_AUDIO: ['audio'],
  TURN_DETECTION_DISABLED: null,
  TURN_DETECTION_SERVER_VAD: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
    create_response: false,
    interrupt_response: true,
  },
};

export const REALTIME_KEYS = {
  TYPE: 'type',
  EVENT_ID: 'event_id',
  AUDIO: 'audio',
  SESSION: 'session',
  RESPONSE: 'response',
  MODEL: 'model',
  INPUT_AUDIO_FORMAT: 'input_audio_format',
  OUTPUT_AUDIO_FORMAT: 'output_audio_format',
  OUTPUT_MODALITIES: 'output_modalities',
  VOICE: 'voice',
  TURN_DETECTION: 'turn_detection',
  INPUT_AUDIO_TRANSCRIPTION: 'input_audio_transcription',
};

export const REALTIME_EVENTS = {
  SESSION_UPDATE: 'session.update',
  RESPONSE_CREATE: 'response.create',
  RESPONSE_CANCEL: 'response.cancel',
  INPUT_AUDIO_CLEAR: 'input_audio_buffer.clear',
  INPUT_AUDIO_APPEND: 'input_audio_buffer.append',
  INPUT_AUDIO_COMMIT: 'input_audio_buffer.commit',
  INPUT_AUDIO_SPEECH_STARTED: 'input_audio_buffer.speech_started',
  OUTPUT_AUDIO_DELTA: 'response.output_audio.delta',
  OUTPUT_AUDIO_DONE: 'response.output_audio.done',
  OUTPUT_AUDIO_TRANSCRIPT_DELTA: 'response.output_audio_transcript.delta',
  OUTPUT_AUDIO_TRANSCRIPT_DONE: 'response.output_audio_transcript.done',
  INPUT_AUDIO_TRANSCRIPT_DELTA: 'conversation.item.input_audio_transcription.delta',
  INPUT_AUDIO_TRANSCRIPT_FAILED: 'conversation.item.input_audio_transcription.failed',
  CONVERSATION_ITEM_TRUNCATE: 'conversation.item.truncate',
};

export const REALTIME_RELAY = {
  READY: 'realtime.ready',
  ERROR: 'realtime.error',
  CLOSED: 'realtime.closed',
  MESSAGE_KEY: 'message',
  CODE_KEY: 'code',
};

export const OLLAMA = {
  GENERATE_PATH: '/api/generate',
  MODEL_KEY: 'model',
  PROMPT_KEY: 'prompt',
  STREAM_KEY: 'stream',
  STREAM_VALUE: false,
  OPTIONS_KEY: 'options',
  OPTIONS_TEMPERATURE_KEY: 'temperature',
  OPTIONS_NUM_PREDICT_KEY: 'num_predict',
  RESPONSE_TEXT_KEY: 'response',
};

export const BRAVE = {
  SEARCH_PATH: '/res/v1/web/search',
  QUERY_PARAM: 'q',
  COUNT_PARAM: 'count',
  RESPONSE_WEB_KEY: 'web',
  RESPONSE_RESULTS_KEY: 'results',
  RESPONSE_TITLE_KEY: 'title',
  RESPONSE_URL_KEY: 'url',
  RESPONSE_DESCRIPTION_KEY: 'description',
  HEADER_SUBSCRIPTION: 'X-Subscription-Token',
};

export const TOOLS = {
  WEB_SEARCH: 'web_search',
};

export const TOOLING = {
  QUERY_KEY: 'query',
  COUNT_KEY: 'count',
  RESULTS_KEY: 'results',
  TOOL_INPUT_TYPE: 'object',
  TOOL_STRING_TYPE: 'string',
  TOOL_NUMBER_TYPE: 'number',
  SCHEMA_TYPE_KEY: 'type',
  SCHEMA_PROPERTIES_KEY: 'properties',
  SCHEMA_REQUIRED_KEY: 'required',
  SCHEMA_DESCRIPTION_KEY: 'description',
  SCHEMA_MINIMUM_KEY: 'minimum',
  SCHEMA_MAXIMUM_KEY: 'maximum',
  SCHEMA_DEFAULT_KEY: 'default',
  TOOL_INSTRUCTIONS:
    'Use the web_search tool when you need up-to-date or factual information from the web. Provide JSON input with a "query" string and optional "count" number. If the user does not need web data, respond normally.',
  WEB_SEARCH_DESCRIPTION:
    'Search the web for relevant, up-to-date information.',
  WEB_SEARCH_QUERY_DESCRIPTION: 'Search query for the web.',
  WEB_SEARCH_COUNT_DESCRIPTION: 'Number of results to return.',
};

export const DEFAULTS = {
  BRAVE_RESULT_COUNT: 5,
};

export const LIMITS = {
  TOOL_MIN_COUNT: 3,
  TOOL_MAX_COUNT: 7,
  AGENT_MAX_STEPS: 4,
  AGENT_JSON_INDENT: 2,
  AGENT_TEMPERATURE: 0.2,
  AGENT_NUM_PREDICT: 220,
  AGENT_LOG_TRUNCATE: 600,
};

export const AGENT = {
  TYPE_KEY: 'type',
  NAME_KEY: 'name',
  ARGUMENTS_KEY: 'arguments',
  ANSWER_KEY: 'answer',
  MODE_TOOL: 'tool',
  MODE_FINAL: 'final',
  ROLE_SYSTEM: 'system',
  ROLE_USER: 'user',
  ROLE_ASSISTANT: 'assistant',
  ROLE_SYSTEM_LABEL: 'SYSTEM',
  ROLE_USER_LABEL: 'USER',
  ROLE_ASSISTANT_LABEL: 'ASSISTANT',
  ROLE_SEPARATOR: ':\n',
  BLOCK_SEPARATOR: '\n\n',
  SYSTEM_PROMPT:
    'You are a tool-using assistant.\n\nYou MUST respond with exactly one JSON object and nothing else (no markdown, no commentary).\n\nTo use web search:\n{"type":"tool","name":"web_search","arguments":{"query":"...","count":5}}\n\nTo answer the user:\n{"type":"final","answer":"..."}\n\nRules:\n- Use web_search when you need up-to-date info, facts, or verification.\n- When using web_search, choose a count between 3 and 7.\n- After receiving results, respond with a tool call or final answer.\n- Use only the provided search results; do not invent citations.',
  INVALID_OUTPUT_PROMPT:
    'INVALID OUTPUT. You must output only valid JSON per schema. Try again now.',
  INVALID_SCHEMA_PROMPT:
    'INVALID JSON SHAPE. Output must match the schema exactly. Try again now.',
  LOCAL_TOOL_CALL_ID: 'local-web-search',
  TOOL_RESULT_PREFIX: 'Tool result (web_search):\n',
  TOOL_RESULT_SUFFIX: '\n\nNow continue and respond with JSON only.',
  FALLBACK_RESPONSE:
    'I could not complete the request within the step limit. Try a more specific question.',
  JSON_FENCE_START: '```json',
  JSON_FENCE_END: '```',
  RESULTS_HEADER: 'Web search results:',
  RESULT_INDEX_SUFFIX: '. ',
  RESULT_URL_LABEL: 'URL: ',
  RESULT_DESCRIPTION_LABEL: 'Summary: ',
  RESULT_LINE_BREAK: '\n',
  RESULT_BLOCK_BREAK: '\n\n',
};

export const LOGS = {
  BOOTSTRAP: 'Bootstrap',
  LOCAL_LLM_ENABLED: 'Local LLM enabled. model: ',
  OPENAI_ENABLED: 'OpenAI enabled. model: ',
  LOCAL_LLM_REQUEST: 'Local LLM request.',
  OPENAI_REQUEST: 'OpenAI request.',
  TOOL_REQUEST: 'Tool request.',
  TOOL_DISABLED: 'Tools disabled.',
  AGENT_REQUEST: 'Agent request.',
  OPENAI_ERROR_STATUS: 'OpenAI request failed. status: ',
  OPENAI_ERROR_BODY: 'OpenAI error body: ',
  AGENT_STEP: 'Agent step: ',
  AGENT_TOOL_CALL_COUNT: 'Agent tool calls: ',
  AGENT_TOOL_NAME: 'Agent tool name: ',
  AGENT_TOOL_QUERY: 'Agent tool query: ',
  AGENT_TOOL_RESULTS: 'Agent tool results: ',
  AGENT_ACTION_FINAL: 'Agent action: final',
  AGENT_ACTION_TOOL: 'Agent action: tool',
  AGENT_PARSE_FAILED: 'Agent parse failed.',
  AGENT_SCHEMA_FAILED: 'Agent schema failed.',
  AGENT_OUTPUT: 'Agent raw output: ',
  AGENT_FALLBACK: 'Agent fallback returned.',
  AGENT_NO_TOOL_CALLS: 'Agent tool calls: 0',
  AGENT_OPENAI_RESPONSE_ID: 'Agent response id: ',
  AGENT_OPENAI_NO_TOOL_CALLS: 'OpenAI no tool calls, returning response.',
  AGENT_TRUNCATED_SUFFIX: '...',
  AGENT_OPENAI_RESPONSE: 'OpenAI response: ',
  AGENT_OPENAI_TEXT: 'OpenAI response text: ',
  AGENT_OPENAI_TEXT_EMPTY: 'OpenAI response text empty.',
  AGENT_STEP_LIMIT: 'Agent step limit reached.',
  BRAVE_RESPONSE: 'Brave response: ',
  BRAVE_RESULTS: 'Brave results: ',
  BRAVE_PARSE_FAILED: 'Brave response parse failed.',
  AGENT_COERCE_FINAL: 'Agent coerced to final.',
  AGENT_COERCE_FAILED: 'Agent coercion failed.',
  REALTIME_CLIENT_CONNECTED: 'Realtime client connected.',
  REALTIME_CLIENT_DISCONNECTED: 'Realtime client disconnected.',
  REALTIME_CLIENT_INVALID: 'Realtime client event invalid.',
  REALTIME_DISABLED: 'Realtime disabled. Closing client.',
  REALTIME_MISSING_CONFIG: 'Realtime config missing. Closing client.',
  REALTIME_OPENAI_CONNECTED: 'Realtime OpenAI socket connected.',
  REALTIME_OPENAI_CLOSED: 'Realtime OpenAI socket closed.',
  REALTIME_OPENAI_ERROR: 'Realtime OpenAI socket error.',
};
