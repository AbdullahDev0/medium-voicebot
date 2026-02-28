/**
 * @file llm.controller.ts
 * @description LLM controller.
 * @module llm/controller
 *
 */

import { Body, Controller, Post } from '@nestjs/common';
import { API } from '../constants';
import { LlmService } from './llm.service';
import { LlmRequestDto } from './dto/llm-request.dto';

@Controller(API.LLM)
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post(API.RESPOND)
  async respond(@Body() body: LlmRequestDto) {
    const input = body.input.trim();
    const text = await this.llmService.requestResponse(input);

    return {
      [API.RESPONSE_TEXT_KEY]: text,
    };
  }

  @Post(API.AGENT)
  async agent(@Body() body: LlmRequestDto) {
    const input = body.input.trim();
    const text = await this.llmService.requestAgentResponse(input);

    return {
      [API.RESPONSE_TEXT_KEY]: text,
    };
  }

  @Post(API.PROPERTIES)
  async properties(@Body() body: LlmRequestDto) {
    const input = body.input.trim();
    const text = await this.llmService.requestPropertyAgentResponse(input);

    return {
      [API.RESPONSE_TEXT_KEY]: text,
    };
  }
}
