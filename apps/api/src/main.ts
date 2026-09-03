import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { Env } from '@infrastructure/config';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    app.enableShutdownHooks();

    const cfg = app.get<ConfigService<Env, true>>(ConfigService);
    await app.listen(cfg.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap();