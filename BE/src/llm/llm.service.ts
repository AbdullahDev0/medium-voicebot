/**
 * @file llm.service.ts
 * @description LLM service for OpenAI and Ollama responses.
 * @module llm/service
 *
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  AGENT,
  BRAVE,
  ERRORS,
  HTTP,
  LIMITS,
  LOGS,
  OLLAMA,
  OPENAI,
  TOOLING,
  TOOLS,
} from '../constants';
import { config } from '../config';
import { ToolsService } from '../tools/tools.service';

type ToolCall = {
  name: string;
  callId: string;
  args: unknown;
};

type AgentMessage = {
  role: string;
  content: string;
};

type AgentAction =
  | {
      type: 'final';
      answer: string;
    }
  | {
      type: 'tool';
      name: string;
      arguments: {
        query: string;
        count?: number;
      };
    };

type AgentCoerceResult = {
  text: string;
  reason: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const truncateLog = (value: string) =>
  value.length > LIMITS.AGENT_LOG_TRUNCATE
    ? `${value.slice(0, LIMITS.AGENT_LOG_TRUNCATE)}${LOGS.AGENT_TRUNCATED_SUFFIX}`
    : value;

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const parseToolArgsForLog = (value: unknown) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return isRecord(value) ? value : null;
};

const extractToolQueryForLog = (args: unknown) => {
  const payload = parseToolArgsForLog(args);
  if (!payload) {
    return '';
  }
  const queryValue = payload[TOOLING.QUERY_KEY];
  return typeof queryValue === 'string' ? queryValue : '';
};

const getRoleLabel = (role: string) => {
  if (role === AGENT.ROLE_SYSTEM) {
    return AGENT.ROLE_SYSTEM_LABEL;
  }

  if (role === AGENT.ROLE_USER) {
    return AGENT.ROLE_USER_LABEL;
  }

  return AGENT.ROLE_ASSISTANT_LABEL;
};

const buildAgentPrompt = (messages: AgentMessage[]) => {
  const blocks = messages.map((message) => {
    const label = getRoleLabel(message.role);
    return `${label}${AGENT.ROLE_SEPARATOR}${message.content}`;
  });

  return `${blocks.join(AGENT.BLOCK_SEPARATOR)}${AGENT.BLOCK_SEPARATOR}${AGENT.ROLE_ASSISTANT_LABEL}${AGENT.ROLE_SEPARATOR}`;
};

const normalizeAgentOutput = (text: string) =>
  text
    .replaceAll(AGENT.JSON_FENCE_START, '')
    .replaceAll(AGENT.JSON_FENCE_END, '')
    .trim();

const extractFirstJsonObject = (text: string) => {
  const cleaned = normalizeAgentOutput(text);
  const start = cleaned.indexOf('{');
  if (start === -1) {
    return null;
  }

  let depth = 0;
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    }

    if (depth === 0) {
      const candidate = cleaned.slice(start, index + 1);
      try {
        return JSON.parse(candidate) as unknown;
      } catch {
        return null;
      }
    }
  }

  return null;
};

const parseAgentAction = (value: unknown): AgentAction | null => {
  if (!isRecord(value)) {
    return null;
  }

  const typeValue = value[AGENT.TYPE_KEY];

  if (typeValue === AGENT.MODE_FINAL) {
    const answerValue = value[AGENT.ANSWER_KEY];
    const answer = typeof answerValue === 'string' ? answerValue.trim() : '';
    if (!answer) {
      return null;
    }

    return {
      type: 'final',
      answer,
    };
  }

  if (typeValue === AGENT.MODE_TOOL) {
    const nameValue = value[AGENT.NAME_KEY];
    const argsValue = value[AGENT.ARGUMENTS_KEY];
    const name = typeof nameValue === 'string' ? nameValue : '';

    if (name !== TOOLS.WEB_SEARCH || !isRecord(argsValue)) {
      return null;
    }

    const queryValue = argsValue[TOOLING.QUERY_KEY];
    const countValue = argsValue[TOOLING.COUNT_KEY];
    const query = typeof queryValue === 'string' ? queryValue.trim() : '';

    if (!query) {
      return null;
    }

    const count =
      typeof countValue === 'number' && Number.isFinite(countValue)
        ? countValue
        : undefined;

    return {
      type: 'tool',
      name,
      arguments: {
        query,
        count,
      },
    };
  }

  return null;
};

const extractResultItemText = (
  value: unknown,
  index: number,
): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  const titleValue = value[BRAVE.RESPONSE_TITLE_KEY];
  const urlValue = value[BRAVE.RESPONSE_URL_KEY];
  const descriptionValue = value[BRAVE.RESPONSE_DESCRIPTION_KEY];
  const title = typeof titleValue === 'string' ? titleValue.trim() : '';
  const url = typeof urlValue === 'string' ? urlValue.trim() : '';
  const description =
    typeof descriptionValue === 'string' ? descriptionValue.trim() : '';

  if (!title && !url && !description) {
    return null;
  }

  const indexLabel = `${index + 1}${AGENT.RESULT_INDEX_SUFFIX}`;
  const lines: string[] = [];

  if (title) {
    lines.push(`${indexLabel}${title}`);
  } else if (url) {
    lines.push(`${indexLabel}${url}`);
  }

  if (url && title) {
    lines.push(`${AGENT.RESULT_URL_LABEL}${url}`);
  }

  if (description) {
    lines.push(`${AGENT.RESULT_DESCRIPTION_LABEL}${description}`);
  }

  return lines.join(AGENT.RESULT_LINE_BREAK);
};

const formatResultList = (items: unknown[]) => {
  const lines = items
    .map((item, index) => extractResultItemText(item, index))
    .filter((item): item is string => Boolean(item));

  if (!lines.length) {
    return null;
  }

  return `${AGENT.RESULTS_HEADER}${AGENT.RESULT_BLOCK_BREAK}${lines.join(
    AGENT.RESULT_BLOCK_BREAK,
  )}`;
};

const coerceAgentFinal = (
  value: unknown,
  raw: string,
): AgentCoerceResult | null => {
  if (typeof raw === 'string' && raw.trim()) {
    return {
      text: raw.trim(),
      reason: 'raw',
    };
  }

  if (Array.isArray(value)) {
    const formattedResults = formatResultList(value);
    if (formattedResults) {
      return {
        text: formattedResults,
        reason: 'results',
      };
    }

    const text = value
      .map((item) => (typeof item === 'string' ? item : safeStringify(item)))
      .filter((item) => item && item.trim())
      .join(AGENT.BLOCK_SEPARATOR);
    if (text) {
      return {
        text,
        reason: 'array',
      };
    }
  }

  if (isRecord(value)) {
    const answerValue = value[AGENT.ANSWER_KEY];
    if (typeof answerValue === 'string' && answerValue.trim()) {
      return {
        text: answerValue.trim(),
        reason: 'answer_key',
      };
    }

    const text = safeStringify(value);
    if (text) {
      return {
        text,
        reason: 'object',
      };
    }
  }

  return null;
};

const normalizeToolCount = (value: number | undefined, fallback: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const rounded = Math.floor(value);

  return Math.min(
    Math.max(rounded, LIMITS.TOOL_MIN_COUNT),
    LIMITS.TOOL_MAX_COUNT,
  );
};

const extractToolResults = (payload: string) => {
  if (!payload) {
    return [];
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!isRecord(parsed)) {
      return [];
    }
    const resultsValue = parsed[TOOLING.RESULTS_KEY];
    return Array.isArray(resultsValue) ? (resultsValue as unknown[]) : [];
  } catch {
    return [];
  }
};

const buildToolResultMessage = (query: string, results: unknown[]) =>
  `${AGENT.TOOL_RESULT_PREFIX}${JSON.stringify(
    {
      [TOOLING.QUERY_KEY]: query,
      [TOOLING.RESULTS_KEY]: results,
    },
    null,
    LIMITS.AGENT_JSON_INDENT,
  )}${AGENT.TOOL_RESULT_SUFFIX}`;

const extractOpenAiText = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const record = data as Record<string, unknown>;

  if (typeof record[OPENAI.OUTPUT_TEXT_PROPERTY] === 'string') {
    return record[OPENAI.OUTPUT_TEXT_PROPERTY] as string;
  }

  const output = Array.isArray(record[OPENAI.OUTPUT_KEY])
    ? (record[OPENAI.OUTPUT_KEY] as Array<Record<string, unknown>>)
    : [];

  for (const item of output) {
    if (item?.type === OPENAI.OUTPUT_MESSAGE_TYPE) {
      const content = Array.isArray(item.content) ? item.content : [];
      for (const part of content as Array<Record<string, unknown>>) {
        if (
          part?.type === OPENAI.OUTPUT_TEXT_TYPE &&
          typeof part.text === 'string'
        ) {
          return part.text;
        }
      }
    }
  }

  return '';
};

const extractOpenAiResponseId = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const record = data as Record<string, unknown>;

  return typeof record[OPENAI.RESPONSE_ID_KEY] === 'string'
    ? (record[OPENAI.RESPONSE_ID_KEY] as string)
    : '';
};

const extractOpenAiToolCalls = (data: unknown): ToolCall[] => {
  if (!data || typeof data !== 'object') {
    return [];
  }

  const record = data as Record<string, unknown>;
  const output = Array.isArray(record[OPENAI.OUTPUT_KEY])
    ? (record[OPENAI.OUTPUT_KEY] as Array<Record<string, unknown>>)
    : [];

  return output
    .filter((item) => item?.type === OPENAI.OUTPUT_FUNCTION_CALL_TYPE)
    .map((item) => {
      const name =
        typeof item[OPENAI.TOOL_CALL_NAME_KEY] === 'string'
          ? (item[OPENAI.TOOL_CALL_NAME_KEY] as string)
          : '';
      const callId =
        typeof item[OPENAI.TOOL_CALL_ID_KEY] === 'string'
          ? (item[OPENAI.TOOL_CALL_ID_KEY] as string)
          : '';
      const args = item[OPENAI.TOOL_CALL_ARGUMENTS_KEY];

      return {
        name,
        callId,
        args,
      };
    })
    .filter((call) => Boolean(call.name && call.callId));
};

const extractOllamaText = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const record = data as Record<string, unknown>;

  return typeof record[OLLAMA.RESPONSE_TEXT_KEY] === 'string'
    ? (record[OLLAMA.RESPONSE_TEXT_KEY] as string)
    : '';
};

const buildOpenAiPayload = (input: unknown, store: boolean) => {
  if (!config.openai) {
    throw new Error(ERRORS.LLM_FAILED);
  }

  return {
    [OPENAI.MODEL_KEY]: config.openai.model,
    [OPENAI.INPUT_KEY]: input,
    [OPENAI.STORE_KEY]: store,
  };
};

const requestOpenAiResponse = async (
  payload: Record<string, unknown>,
  logger?: Logger,
) => {
  if (!config.openai) {
    throw new Error(ERRORS.LLM_FAILED);
  }

  const response = await fetch(
    `${config.openai.baseUrl}${OPENAI.RESPONSES_PATH}`,
    {
      method: HTTP.METHOD_POST,
      headers: {
        [HTTP.HEADER_CONTENT_TYPE]: HTTP.CONTENT_TYPE_JSON,
        [HTTP.HEADER_AUTH]: `${HTTP.BEARER_PREFIX}${config.openai.apiKey}`,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    if (logger) {
      logger.error(`${LOGS.OPENAI_ERROR_STATUS}${response.status}`);
      if (body) {
        logger.error(`${LOGS.OPENAI_ERROR_BODY}${body}`);
      }
    }
    throw new Error(ERRORS.LLM_FAILED);
  }

  return (await response.json()) as unknown;
};

const requestOpenAi = async (input: string, logger?: Logger) => {
  const data = await requestOpenAiResponse(
    buildOpenAiPayload(input, OPENAI.STORE_DISABLED),
    logger,
  );
  const text = extractOpenAiText(data);

  if (!text) {
    throw new Error(ERRORS.LLM_EMPTY);
  }

  return text;
};

const buildOllamaOptions = (options?: {
  temperature?: number;
  numPredict?: number;
}) => {
  if (!options) {
    return null;
  }

  const payload: Record<string, number> = {};

  if (
    typeof options.temperature === 'number' &&
    Number.isFinite(options.temperature)
  ) {
    payload[OLLAMA.OPTIONS_TEMPERATURE_KEY] = options.temperature;
  }

  if (
    typeof options.numPredict === 'number' &&
    Number.isFinite(options.numPredict)
  ) {
    payload[OLLAMA.OPTIONS_NUM_PREDICT_KEY] = options.numPredict;
  }

  return Object.keys(payload).length ? payload : null;
};

const requestOllamaCompletion = async (
  prompt: string,
  options?: {
    temperature?: number;
    numPredict?: number;
  },
) => {
  if (!config.ollama) {
    throw new Error(ERRORS.LLM_FAILED);
  }

  const optionsPayload = buildOllamaOptions(options);
  const response = await fetch(
    `${config.ollama.baseUrl}${OLLAMA.GENERATE_PATH}`,
    {
      method: HTTP.METHOD_POST,
      headers: {
        [HTTP.HEADER_CONTENT_TYPE]: HTTP.CONTENT_TYPE_JSON,
      },
      body: JSON.stringify({
        [OLLAMA.MODEL_KEY]: config.ollama.model,
        [OLLAMA.PROMPT_KEY]: prompt,
        [OLLAMA.STREAM_KEY]: OLLAMA.STREAM_VALUE,
        ...(optionsPayload ? { [OLLAMA.OPTIONS_KEY]: optionsPayload } : {}),
      }),
    },
  );

  if (!response.ok) {
    throw new Error(ERRORS.LLM_FAILED);
  }

  const data = (await response.json()) as unknown;
  const text = extractOllamaText(data);

  if (!text) {
    throw new Error(ERRORS.LLM_EMPTY);
  }

  return text;
};

const requestOllama = async (input: string) => requestOllamaCompletion(input);

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly toolsService: ToolsService) {}

  private logAgent(message: string) {
    if (config.logging.agentDebug) {
      this.logger.log(message);
    }
  }

  async requestResponse(input: string) {
    if (config.llm.useLocal) {
      this.logger.log(LOGS.LOCAL_LLM_REQUEST);
      return requestOllama(input);
    }

    this.logger.log(LOGS.OPENAI_REQUEST);
    return requestOpenAi(input, this.logger);
  }

  async requestAgentResponse(input: string) {
    if (!config.tools.enabled) {
      this.logger.log(LOGS.TOOL_DISABLED);
      throw new Error(ERRORS.TOOLS_DISABLED);
    }

    this.logger.log(LOGS.AGENT_REQUEST);

    if (config.llm.useLocal) {
      this.logger.log(LOGS.LOCAL_LLM_REQUEST);
      return this.requestOllamaWithTools(input);
    }

    this.logger.log(LOGS.OPENAI_REQUEST);
    return this.requestOpenAiWithTools(input);
  }

  private async requestOllamaWithTools(input: string) {
    if (!config.brave) {
      throw new Error(ERRORS.TOOLS_DISABLED);
    }

    const messages: AgentMessage[] = [
      {
        role: AGENT.ROLE_SYSTEM,
        content: AGENT.SYSTEM_PROMPT,
      },
      {
        role: AGENT.ROLE_USER,
        content: input,
      },
    ];

    for (let step = 0; step < LIMITS.AGENT_MAX_STEPS; step += 1) {
      this.logAgent(`${LOGS.AGENT_STEP}${step + 1}`);
      const prompt = buildAgentPrompt(messages);
      const raw = await requestOllamaCompletion(prompt, {
        temperature: LIMITS.AGENT_TEMPERATURE,
        numPredict: LIMITS.AGENT_NUM_PREDICT,
      });
      this.logAgent(`${LOGS.AGENT_OUTPUT}${truncateLog(raw)}`);
      const parsedJson = extractFirstJsonObject(raw);

      if (!parsedJson) {
        this.logAgent(LOGS.AGENT_PARSE_FAILED);
        this.logAgent(`${LOGS.AGENT_OUTPUT}${truncateLog(raw)}`);
        messages.push({
          role: AGENT.ROLE_USER,
          content: AGENT.INVALID_OUTPUT_PROMPT,
        });
        continue;
      }

      const action = parseAgentAction(parsedJson);

      if (!action) {
        this.logAgent(LOGS.AGENT_SCHEMA_FAILED);
        this.logAgent(`${LOGS.AGENT_OUTPUT}${truncateLog(raw)}`);
        const coerced = coerceAgentFinal(parsedJson, raw);
        if (coerced) {
          this.logAgent(`${LOGS.AGENT_COERCE_FINAL}${coerced.reason}`);
          return coerced.text;
        }
        messages.push({
          role: AGENT.ROLE_USER,
          content: AGENT.INVALID_SCHEMA_PROMPT,
        });
        continue;
      }

      if (action.type === 'final') {
        this.logAgent(LOGS.AGENT_ACTION_FINAL);
        return action.answer;
      }

      this.logAgent(LOGS.AGENT_ACTION_TOOL);
      this.logAgent(`${LOGS.AGENT_TOOL_NAME}${action.name}`);
      this.logAgent(`${LOGS.AGENT_TOOL_QUERY}${action.arguments.query}`);
      const count = normalizeToolCount(
        action.arguments.count,
        config.brave.resultCount,
      );
      const toolArgs = {
        [TOOLING.QUERY_KEY]: action.arguments.query,
        [TOOLING.COUNT_KEY]: count,
      };
      const [toolOutput] = await this.toolsService.runToolCalls([
        {
          name: TOOLS.WEB_SEARCH,
          callId: AGENT.LOCAL_TOOL_CALL_ID,
          args: toolArgs,
        },
      ]);
      const results = extractToolResults(toolOutput?.output ?? '');
      this.logAgent(`${LOGS.AGENT_TOOL_RESULTS}${results.length}`);

      messages.push({
        role: AGENT.ROLE_ASSISTANT,
        content: JSON.stringify(action),
      });
      messages.push({
        role: AGENT.ROLE_USER,
        content: buildToolResultMessage(action.arguments.query, results),
      });
    }

    this.logAgent(LOGS.AGENT_FALLBACK);
    return AGENT.FALLBACK_RESPONSE;
  }

  private async requestOpenAiWithTools(input: string) {
    const tools = this.toolsService.getToolDefinitions();
    const initialPayload = {
      ...buildOpenAiPayload(input, OPENAI.STORE_ENABLED),
      [OPENAI.TOOLS_KEY]: tools,
      [OPENAI.INSTRUCTIONS_KEY]: TOOLING.TOOL_INSTRUCTIONS,
    };
    let currentResponse = await requestOpenAiResponse(
      initialPayload,
      this.logger,
    );

    for (let step = 0; step < LIMITS.AGENT_MAX_STEPS; step += 1) {
      this.logAgent(`${LOGS.AGENT_STEP}${step + 1}`);
      const responseJson = safeStringify(currentResponse);
      if (responseJson) {
        this.logAgent(
          `${LOGS.AGENT_OPENAI_RESPONSE}${truncateLog(responseJson)}`,
        );
      }
      const toolCalls = extractOpenAiToolCalls(currentResponse);

      if (!toolCalls.length) {
        this.logAgent(LOGS.AGENT_OPENAI_NO_TOOL_CALLS);
        const text = extractOpenAiText(currentResponse);
        if (text) {
          this.logAgent(`${LOGS.AGENT_OPENAI_TEXT}${truncateLog(text)}`);
        } else {
          this.logAgent(LOGS.AGENT_OPENAI_TEXT_EMPTY);
        }
        if (!text) {
          throw new Error(ERRORS.LLM_EMPTY);
        }
        return text;
      }

      this.logAgent(`${LOGS.AGENT_TOOL_CALL_COUNT}${toolCalls.length}`);
      toolCalls.forEach((call) => {
        this.logAgent(`${LOGS.AGENT_TOOL_NAME}${call.name}`);
        const query = extractToolQueryForLog(call.args);
        if (query) {
          this.logAgent(`${LOGS.AGENT_TOOL_QUERY}${query}`);
        }
      });

      this.logger.log(LOGS.TOOL_REQUEST);
      const responseId = extractOpenAiResponseId(currentResponse);

      if (!responseId) {
        throw new Error(ERRORS.LLM_FAILED);
      }

      this.logAgent(`${LOGS.AGENT_OPENAI_RESPONSE_ID}${responseId}`);
      const toolOutputs = await this.toolsService.runToolCalls(toolCalls);
      const outputItems = toolOutputs.map((output) => ({
        type: OPENAI.TOOL_CALL_OUTPUT_TYPE,
        [OPENAI.TOOL_CALL_ID_KEY]: output.callId,
        [OPENAI.TOOL_OUTPUT_KEY]: output.output,
      }));
      toolOutputs.forEach((output) => {
        const results = extractToolResults(output.output);
        this.logAgent(`${LOGS.AGENT_TOOL_RESULTS}${results.length}`);
      });

      const followUpPayload = {
        ...buildOpenAiPayload(outputItems, OPENAI.STORE_ENABLED),
        [OPENAI.PREVIOUS_RESPONSE_ID_KEY]: responseId,
        [OPENAI.TOOLS_KEY]: tools,
        [OPENAI.INSTRUCTIONS_KEY]: TOOLING.TOOL_INSTRUCTIONS,
      };

      currentResponse = await requestOpenAiResponse(
        followUpPayload,
        this.logger,
      );
    }

    this.logAgent(LOGS.AGENT_STEP_LIMIT);
    this.logAgent(LOGS.AGENT_FALLBACK);
    return AGENT.FALLBACK_RESPONSE;
  }
}
