/**
 * @file search.module.ts
 * @description Search module for external web search providers.
 * @module search/module
 *
 */

import { Module } from '@nestjs/common';
import { BraveSearchService } from './brave-search.service';

@Module({
  providers: [BraveSearchService],
  exports: [BraveSearchService],
})
export class SearchModule {}
