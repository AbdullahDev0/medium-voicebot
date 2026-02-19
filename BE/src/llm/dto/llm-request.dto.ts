/**
 * @file llm-request.dto.ts
 * @description DTO for LLM request payload.
 * @module llm/dto/request
 *
 */

import { IsNotEmpty, IsString } from 'class-validator';

export class LlmRequestDto {
  @IsString()
  @IsNotEmpty()
  input!: string;
}
