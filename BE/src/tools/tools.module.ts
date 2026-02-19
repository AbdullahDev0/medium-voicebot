/**
 * @file tools.module.ts
 * @description Tooling module for model tool calls.
 * @module tools/module
 *
 */

import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [SearchModule],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
