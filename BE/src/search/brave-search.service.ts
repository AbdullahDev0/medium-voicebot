/**
 * @file brave-search.service.ts
 * @description Brave Search API integration service.
 * @module search/brave
 *
 */

import { Injectable, Logger } from '@nestjs/common';
import { BRAVE, ERRORS, HTTP, LIMITS, LOGS } from '../constants';
import { config } from '../config';

const extractSearchResults = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return [];
  }

  const record = data as Record<string, unknown>;
  const web = record[BRAVE.RESPONSE_WEB_KEY] as
    | Record<string, unknown>
    | undefined;
  const results = Array.isArray(web?.[BRAVE.RESPONSE_RESULTS_KEY])
    ? (web?.[BRAVE.RESPONSE_RESULTS_KEY] as Array<Record<string, unknown>>)
    : [];

  return results
    .map((item) => {
      const title =
        typeof item[BRAVE.RESPONSE_TITLE_KEY] === 'string'
          ? (item[BRAVE.RESPONSE_TITLE_KEY] as string)
          : '';
      const url =
        typeof item[BRAVE.RESPONSE_URL_KEY] === 'string'
          ? (item[BRAVE.RESPONSE_URL_KEY] as string)
          : '';
      const description =
        typeof item[BRAVE.RESPONSE_DESCRIPTION_KEY] === 'string'
          ? (item[BRAVE.RESPONSE_DESCRIPTION_KEY] as string)
          : '';

      return {
        [BRAVE.RESPONSE_TITLE_KEY]: title,
        [BRAVE.RESPONSE_URL_KEY]: url,
        [BRAVE.RESPONSE_DESCRIPTION_KEY]: description,
      };
    })
    .filter((item) =>
      Boolean(
        item[BRAVE.RESPONSE_TITLE_KEY] ||
        item[BRAVE.RESPONSE_URL_KEY] ||
        item[BRAVE.RESPONSE_DESCRIPTION_KEY],
      ),
    );
};

const truncateLog = (value: string) =>
  value.length > LIMITS.AGENT_LOG_TRUNCATE
    ? `${value.slice(0, LIMITS.AGENT_LOG_TRUNCATE)}${LOGS.AGENT_TRUNCATED_SUFFIX}`
    : value;

@Injectable()
export class BraveSearchService {
  private readonly logger = new Logger(BraveSearchService.name);

  private logDebug(message: string) {
    if (config.logging.agentDebug) {
      this.logger.log(message);
    }
  }

  async search(query: string, count?: number) {
    if (!config.brave) {
      throw new Error(ERRORS.SEARCH_FAILED);
    }

    const resultCount =
      typeof count === 'number' && Number.isFinite(count)
        ? count
        : config.brave.resultCount;
    const url = new URL(`${config.brave.baseUrl}${BRAVE.SEARCH_PATH}`);
    url.searchParams.set(BRAVE.QUERY_PARAM, query);
    url.searchParams.set(BRAVE.COUNT_PARAM, String(resultCount));

    const response = await fetch(url.toString(), {
      method: HTTP.METHOD_GET,
      headers: {
        [HTTP.HEADER_ACCEPT]: HTTP.ACCEPT_JSON,
        [HTTP.HEADER_ACCEPT_ENCODING]: HTTP.ACCEPT_ENCODING,
        [BRAVE.HEADER_SUBSCRIPTION]: config.brave.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(ERRORS.SEARCH_FAILED);
    }

    const rawText = await response.text();
    this.logDebug(`${LOGS.BRAVE_RESPONSE}${truncateLog(rawText)}`);

    let data: unknown;

    try {
      data = JSON.parse(rawText) as unknown;
    } catch {
      this.logDebug(LOGS.BRAVE_PARSE_FAILED);
      throw new Error(ERRORS.SEARCH_FAILED);
    }

    const results = extractSearchResults(data);
    this.logDebug(
      `${LOGS.BRAVE_RESULTS}${truncateLog(JSON.stringify(results))}`,
    );

    return results;
  }
}
