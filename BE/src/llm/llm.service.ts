/**
 * @file llm.service.ts
 * @description LLM service for OpenAI and Ollama responses.
 * @module llm/service
 *
 */

import { Injectable } from '@nestjs/common';
import { ERRORS, HTTP, OLLAMA, OPENAI } from '../constants';
import { config } from '../config';

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

const extractOllamaText = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const record = data as Record<string, unknown>;

  return typeof record[OLLAMA.RESPONSE_TEXT_KEY] === 'string'
    ? (record[OLLAMA.RESPONSE_TEXT_KEY] as string)
    : '';
};

const requestOpenAi = async (input: string) => {
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
      body: JSON.stringify({
        [OPENAI.MODEL_KEY]: config.openai.model,
        [OPENAI.INPUT_KEY]: input,
        [OPENAI.STORE_KEY]: OPENAI.STORE_VALUE,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(ERRORS.LLM_FAILED);
  }

  const data = (await response.json()) as unknown;
  const text = extractOpenAiText(data);

  if (!text) {
    throw new Error(ERRORS.LLM_EMPTY);
  }

  return text;
};

const requestOllama = async (input: string) => {
  if (!config.ollama) {
    throw new Error(ERRORS.LLM_FAILED);
  }

  const response = await fetch(
    `${config.ollama.baseUrl}${OLLAMA.GENERATE_PATH}`,
    {
      method: HTTP.METHOD_POST,
      headers: {
        [HTTP.HEADER_CONTENT_TYPE]: HTTP.CONTENT_TYPE_JSON,
      },
      body: JSON.stringify({
        [OLLAMA.MODEL_KEY]: config.ollama.model,
        [OLLAMA.PROMPT_KEY]: input,
        [OLLAMA.STREAM_KEY]: OLLAMA.STREAM_VALUE,
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

@Injectable()
export class LlmService {
  async requestResponse(input: string) {
    if (config.llm.useLocal) {
      return requestOllama(input);
    }

    return requestOpenAi(input);
  }
}
