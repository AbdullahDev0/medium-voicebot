/**
 * @file rag.service.ts
 * @description JSON-based property search service.
 * @module rag/service
 *
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { config } from '../config';
import { DEFAULTS, DELIMITERS, ERRORS, LIMITS, LOGS, RAG } from '../constants';

type PropertyRecord = Record<string, unknown>;

type IndexedProperty = {
  record: PropertyRecord;
  tokens: Set<string>;
};

const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]+/gi;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toTextParts = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === 'string') {
    return value.trim() ? [value] : [];
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => toTextParts(item));
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => toTextParts(item));
  }

  return [];
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_REGEX, DELIMITERS.SPACE)
    .trim();

const tokenize = (value: string, stopWords: Set<string>) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }
  return normalized
    .split(DELIMITERS.SPACE)
    .map((token) => token.trim())
    .filter((token) => token.length >= RAG.MIN_TOKEN_LENGTH)
    .filter((token) => !stopWords.has(token));
};

const buildTokenSet = (record: PropertyRecord, stopWords: Set<string>) => {
  const text = toTextParts(record).join(DELIMITERS.SPACE);
  const tokens = tokenize(text, stopWords);
  return new Set(tokens);
};

const scoreTokens = (queryTokens: string[], tokens: Set<string>) =>
  queryTokens.reduce(
    (score, token) => (tokens.has(token) ? score + 1 : score),
    0,
  );

const normalizeTopK = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULTS.PROPERTY_RESULT_COUNT;
  }
  const rounded = Math.floor(value);
  return Math.min(
    Math.max(rounded, LIMITS.PROPERTY_MIN_COUNT),
    LIMITS.PROPERTY_MAX_COUNT,
  );
};

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private index: IndexedProperty[] = [];
  private loaded = false;
  private readonly stopWords = new Set(RAG.STOP_WORDS);

  async onModuleInit() {
    if (!config.rag.enabled) {
      return;
    }
    await this.loadData();
  }

  private async loadData() {
    try {
      const raw = await readFile(config.rag.dataPath, {
        encoding: RAG.FILE_ENCODING,
      });
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error(ERRORS.RAG_DATA_LOAD_FAILED);
      }
      const records = parsed.filter(isRecord);
      this.index = records.map((record) => ({
        record,
        tokens: buildTokenSet(record, this.stopWords),
      }));
      this.loaded = true;
      this.logger.log(`${LOGS.RAG_DATA_LOADED}${this.index.length}`);
    } catch (error) {
      this.loaded = false;
      this.index = [];
      this.logger.error(LOGS.RAG_DATA_LOAD_FAILED);
      throw error instanceof Error ? error : new Error(ERRORS.RAG_DATA_LOAD_FAILED);
    }
  }

  search(query: string, topK?: number) {
    if (!config.rag.enabled) {
      throw new Error(ERRORS.TOOLS_DISABLED);
    }
    const trimmed = typeof query === 'string' ? query.trim() : '';
    if (!trimmed) {
      throw new Error(ERRORS.RAG_QUERY_EMPTY);
    }
    if (!this.loaded) {
      throw new Error(ERRORS.RAG_DATA_LOAD_FAILED);
    }
    const queryTokens = tokenize(trimmed, this.stopWords);
    if (!queryTokens.length) {
      return [];
    }
    const scored = this.index
      .map((entry) => ({
        record: entry.record,
        score: scoreTokens(queryTokens, entry.tokens),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const limit = normalizeTopK(topK);
    return scored.slice(0, limit).map((item) => item.record);
  }
}
