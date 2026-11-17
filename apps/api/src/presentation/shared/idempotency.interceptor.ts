import { createHash } from 'node:crypto';
import { catchError, from, mergeMap, Observable, of, throwError } from 'rxjs';
import {
    applyDecorators,
    BadRequestException,
    CallHandler,
    ConflictException,
    ExecutionContext,
    Inject,
    Injectable,
    NestInterceptor,
    UnprocessableEntityException,
    UseInterceptors,
} from '@nestjs/common';

import type { AccessTokenPayload } from '@application/auth/ports/token.port';
import { IDEMPOTENCY_STORE, type IdempotencyStore } from '@application/shared/ports/idempotency-store.port';

export const IDEMPOTENCY_HEADER = 'idempotency-key';

interface HttpRequestLike {
    method: string;
    originalUrl: string;
    body: unknown;
    headers: Record<string, string | string[] | undefined>;
    user?: AccessTokenPayload;
}

interface HttpResponseLike {
    statusCode: number;
    status(code: number): this;
}

/**
 * Makes a mutating endpoint safe to retry. The client sends a unique `Idempotency-Key`
 * per logical operation; a retry with the same key and body replays the first response
 * instead of running the handler again. Must run after JwtAuthGuard (keys are per user).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(@Inject(IDEMPOTENCY_STORE) private readonly store: IdempotencyStore) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp();
        const request = http.getRequest<HttpRequestLike>();
        const response = http.getResponse<HttpResponseLike>();

        const userId = request.user?.sub;
        if (!userId) throw new BadRequestException({ code: 'IDEMPOTENCY_NEEDS_AUTH', message: 'Authentication required' });

        const rawKey = request.headers[IDEMPOTENCY_HEADER];
        const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
        if (!key || key.length < 8 || key.length > 128) {
            throw new BadRequestException({
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message: 'Idempotency-Key header (8-128 chars) is required',
            });
        }

        const requestHash = createHash('sha256')
            .update(`${request.method} ${request.originalUrl.split('?')[0]}\n${JSON.stringify(request.body ?? null)}`)
            .digest('hex');

        return from(this.store.claim(userId, key, requestHash)).pipe(
            mergeMap((claim) => {
                switch (claim.state) {
                    case 'replay':
                        response.status(claim.status);
                        return of(claim.body);
                    case 'in_flight':
                        return throwError(
                            () =>
                                new ConflictException({
                                    code: 'IDEMPOTENCY_IN_PROGRESS',
                                    message: 'A request with this key is still being processed',
                                }),
                        );
                    case 'mismatch':
                        return throwError(
                            () =>
                                new UnprocessableEntityException({
                                    code: 'IDEMPOTENCY_KEY_REUSED',
                                    message: 'This Idempotency-Key was used with a different request',
                                }),
                        );
                    case 'claimed':
                        return next.handle().pipe(
                            mergeMap((body: unknown) =>
                                from(this.store.complete(userId, key, response.statusCode, body)).pipe(
                                    mergeMap(() => of(body)),
                                ),
                            ),
                            catchError((error: unknown) =>
                                from(this.store.release(userId, key)).pipe(mergeMap(() => throwError(() => error))),
                            ),
                        );
                }
            }),
        );
    }
}

export const Idempotent = (): MethodDecorator & ClassDecorator => applyDecorators(UseInterceptors(IdempotencyInterceptor));
