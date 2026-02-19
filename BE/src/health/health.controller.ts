/**
 * @file health.controller.ts
 * @description Health check controller.
 * @module health/controller
 *
 */

import { Controller, Get } from '@nestjs/common';
import { API } from '../constants';

@Controller(API.HEALTH)
export class HealthController {
  @Get()
  getHealth() {
    return { [API.RESPONSE_STATUS_KEY]: API.HEALTH };
  }
}
