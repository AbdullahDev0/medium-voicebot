/**
 * @file tools.service.ts
 * @description Tooling service for executing model tool calls.
 * @module tools/service
 *
 */

import { Injectable } from '@nestjs/common';
import { DEFAULTS, ERRORS, LIMITS, OPENAI, TOOLING, TOOLS } from '../constants';
import { BraveSearchService } from '../search/brave-search.service';
import { config } from '../config';
import { RagService } from '../rag/rag.service';

type ToolCall = {
  name: string;
  callId: string;
  args: unknown;
};

type ToolOutput = {
  callId: string;
  output: string;
};

const parseToolArgs = (value: unknown) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      throw new Error(ERRORS.TOOL_INPUT_INVALID);
    }
  }

  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  throw new Error(ERRORS.TOOL_INPUT_INVALID);
};

@Injectable()
export class ToolsService {
  constructor(
    private readonly braveSearch: BraveSearchService,
    private readonly ragService: RagService,
  ) {}

  getToolDefinitions() {
    const tools: Array<Record<string, unknown>> = [];

    if (config.tools.webSearchEnabled) {
      const defaultCount =
        config.brave?.resultCount ?? DEFAULTS.BRAVE_RESULT_COUNT;
      tools.push({
        type: OPENAI.TOOL_TYPE_FUNCTION,
        [OPENAI.FUNCTION_NAME_KEY]: TOOLS.WEB_SEARCH,
        [OPENAI.FUNCTION_DESCRIPTION_KEY]: TOOLING.WEB_SEARCH_DESCRIPTION,
        [OPENAI.FUNCTION_PARAMETERS_KEY]: {
          [TOOLING.SCHEMA_TYPE_KEY]: TOOLING.TOOL_INPUT_TYPE,
          [TOOLING.SCHEMA_PROPERTIES_KEY]: {
            [TOOLING.QUERY_KEY]: {
              [TOOLING.SCHEMA_TYPE_KEY]: TOOLING.TOOL_STRING_TYPE,
              [TOOLING.SCHEMA_DESCRIPTION_KEY]:
                TOOLING.WEB_SEARCH_QUERY_DESCRIPTION,
            },
            [TOOLING.COUNT_KEY]: {
              [TOOLING.SCHEMA_TYPE_KEY]: TOOLING.TOOL_NUMBER_TYPE,
              [TOOLING.SCHEMA_DESCRIPTION_KEY]:
                TOOLING.WEB_SEARCH_COUNT_DESCRIPTION,
              [TOOLING.SCHEMA_MINIMUM_KEY]: LIMITS.TOOL_MIN_COUNT,
              [TOOLING.SCHEMA_MAXIMUM_KEY]: LIMITS.TOOL_MAX_COUNT,
              [TOOLING.SCHEMA_DEFAULT_KEY]: defaultCount,
            },
          },
          [TOOLING.SCHEMA_REQUIRED_KEY]: [TOOLING.QUERY_KEY],
        },
      });
    }

    if (config.tools.ragEnabled) {
      tools.push({
        type: OPENAI.TOOL_TYPE_FUNCTION,
        [OPENAI.FUNCTION_NAME_KEY]: TOOLS.PROPERTY_SEARCH,
        [OPENAI.FUNCTION_DESCRIPTION_KEY]: TOOLING.PROPERTY_SEARCH_DESCRIPTION,
        [OPENAI.FUNCTION_PARAMETERS_KEY]: {
          [TOOLING.SCHEMA_TYPE_KEY]: TOOLING.TOOL_INPUT_TYPE,
          [TOOLING.SCHEMA_PROPERTIES_KEY]: {
            [TOOLING.QUERY_KEY]: {
              [TOOLING.SCHEMA_TYPE_KEY]: TOOLING.TOOL_STRING_TYPE,
              [TOOLING.SCHEMA_DESCRIPTION_KEY]:
                TOOLING.PROPERTY_SEARCH_QUERY_DESCRIPTION,
            },
            [TOOLING.TOP_K_KEY]: {
              [TOOLING.SCHEMA_TYPE_KEY]: TOOLING.TOOL_NUMBER_TYPE,
              [TOOLING.SCHEMA_DESCRIPTION_KEY]:
                TOOLING.PROPERTY_SEARCH_TOP_K_DESCRIPTION,
              [TOOLING.SCHEMA_MINIMUM_KEY]: LIMITS.PROPERTY_MIN_COUNT,
              [TOOLING.SCHEMA_MAXIMUM_KEY]: LIMITS.PROPERTY_MAX_COUNT,
              [TOOLING.SCHEMA_DEFAULT_KEY]: DEFAULTS.PROPERTY_RESULT_COUNT,
            },
          },
          [TOOLING.SCHEMA_REQUIRED_KEY]: [TOOLING.QUERY_KEY],
        },
      });
    }

    return tools;
  }

  async runToolCalls(calls: ToolCall[]) {
    const outputs = await Promise.all(
      calls.map((call) => this.runToolCall(call)),
    );

    return outputs;
  }

  private async runToolCall(call: ToolCall): Promise<ToolOutput> {
    if (call.name === TOOLS.WEB_SEARCH) {
      if (!config.tools.webSearchEnabled) {
        throw new Error(ERRORS.TOOL_UNSUPPORTED);
      }
      const payload = parseToolArgs(call.args);
      const queryValue = payload[TOOLING.QUERY_KEY];
      const countValue = payload[TOOLING.COUNT_KEY];
      const query = typeof queryValue === 'string' ? queryValue.trim() : '';
      const count =
        typeof countValue === 'number' && Number.isFinite(countValue)
          ? Math.min(
              Math.max(Math.floor(countValue), LIMITS.TOOL_MIN_COUNT),
              LIMITS.TOOL_MAX_COUNT,
            )
          : undefined;

      if (!query) {
        throw new Error(ERRORS.TOOL_INPUT_INVALID);
      }

      const results = await this.braveSearch.search(query, count);
      const output = JSON.stringify({
        [TOOLING.RESULTS_KEY]: results,
      });

      return {
        callId: call.callId,
        output,
      };
    }

    if (call.name === TOOLS.PROPERTY_SEARCH) {
      if (!config.tools.ragEnabled) {
        throw new Error(ERRORS.TOOL_UNSUPPORTED);
      }
      const payload = parseToolArgs(call.args);
      const queryValue = payload[TOOLING.QUERY_KEY];
      const topKValue = payload[TOOLING.TOP_K_KEY];
      const query = typeof queryValue === 'string' ? queryValue.trim() : '';
      const topK =
        typeof topKValue === 'number' && Number.isFinite(topKValue)
          ? Math.min(
              Math.max(Math.floor(topKValue), LIMITS.PROPERTY_MIN_COUNT),
              LIMITS.PROPERTY_MAX_COUNT,
            )
          : undefined;

      if (!query) {
        throw new Error(ERRORS.TOOL_INPUT_INVALID);
      }

      const results = this.ragService.search(query, topK);
      const output = JSON.stringify({
        [TOOLING.RESULTS_KEY]: results,
      });

      return {
        callId: call.callId,
        output,
      };
    }

    throw new Error(ERRORS.TOOL_UNSUPPORTED);
  }
}
