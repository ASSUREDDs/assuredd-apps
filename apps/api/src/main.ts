import 'reflect-metadata';

import { ZodValidationPipe } from 'nestjs-zod';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import type { Env } from '@infrastructure/config';
import { GlobalExceptionFilter } from '@presentation/shared/global-exception.filter';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    app.enableShutdownHooks();
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter());

    const cfg = app.get<ConfigService<Env, true>>(ConfigService);
    await app.listen(cfg.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap();