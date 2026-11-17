import { Global, Module } from '@nestjs/common';

import { IDEMPOTENCY_STORE } from '@application/shared/ports/idempotency-store.port';
import { DrizzleIdempotencyStore } from '@infrastructure/idempotency/drizzle-idempotency.store';

import { IdempotencyInterceptor } from './idempotency.interceptor';

@Global()
@Module({
    providers: [{ provide: IDEMPOTENCY_STORE, useClass: DrizzleIdempotencyStore }, IdempotencyInterceptor],
    exports: [IDEMPOTENCY_STORE, IdempotencyInterceptor],
})
export class IdempotencyModule {}
