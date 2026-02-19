/**
 * @file main.ts
 * @description Application bootstrap for the Voicebot Console backend.
 * @module main
 *
 */

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { API } from './constants';
import { config } from './config';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API.PREFIX);
  app.enableCors({ origin: config.cors.origin });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(config.server.port);
};

void bootstrap();
