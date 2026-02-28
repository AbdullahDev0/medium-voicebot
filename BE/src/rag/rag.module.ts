/**
 * @file rag.module.ts
 * @description JSON-based RAG module.
 * @module rag/module
 *
 */

import { Module } from '@nestjs/common';
import { RagService } from './rag.service';

@Module({
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
