/**
 * @file llm.ts
 * @description LLM request abstraction via backend gateway.
 * @module services/llm
 *
 * Notes:
 * - Versioning will be added only when explicitly requested.
 */

import { API_PATHS, API_REQUEST, API_RESPONSE, ERRORS, HTTP } from '../constants';
import { config } from '../config';

export const requestAssistantResponse = async ({ input }: { input: string }) => {
  const response = await fetch(`${config.api.baseUrl}${API_PATHS.LLM_RESPOND}`,
    {
      method: HTTP.METHOD_POST,
      headers: {
        [HTTP.HEADER_CONTENT_TYPE]: HTTP.CONTENT_TYPE_JSON,
      },
      body: JSON.stringify({
        [API_REQUEST.INPUT_KEY]: input,
      }),
    });

  if (!response.ok) {
    throw new Error(ERRORS.LLM_FAILED);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const text = typeof data?.[API_RESPONSE.TEXT_KEY] === 'string'
    ? (data[API_RESPONSE.TEXT_KEY] as string)
    : '';

  if (!text) {
    throw new Error(ERRORS.LLM_EMPTY);
  }

  return text;
};
