import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';

import type { IdempotencyClaim, IdempotencyStore } from '@application/shared/ports/idempotency-store.port';
import { type Database, DB } from '@infrastructure/db';
import { idempotencyKeys } from '@infrastructure/db/schema';

// A request that claimed a key but never completed (process crash) can be taken over after this.
const STALE_IN_FLIGHT_MS = 60_000;

@Injectable()
export class DrizzleIdempotencyStore implements IdempotencyStore {
    constructor(@Inject(DB) private readonly db: Database) {}

    async claim(userId: string, key: string, requestHash: string): Promise<IdempotencyClaim> {
        const inserted = await this.db
            .insert(idempotencyKeys)
            .values({ userId, key, requestHash })
            .onConflictDoNothing()
            .returning({ key: idempotencyKeys.key });
        if (inserted.length > 0) return { state: 'claimed' };

        const [row] = await this.db
            .select()
            .from(idempotencyKeys)
            .where(and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key)))
            .limit(1);
        // Row vanished between the insert and the select (released): let the caller retry the claim.
        if (!row) return this.claim(userId, key, requestHash);

        if (row.requestHash !== requestHash) return { state: 'mismatch' };
        if (row.responseStatus !== null) return { state: 'replay', status: row.responseStatus, body: row.responseBody };

        const staleBefore = new Date(Date.now() - STALE_IN_FLIGHT_MS);
        const taken = await this.db
            .update(idempotencyKeys)
            .set({ createdAt: sql`now()` })
            .where(
                and(
                    eq(idempotencyKeys.userId, userId),
                    eq(idempotencyKeys.key, key),
                    isNull(idempotencyKeys.responseStatus),
                    lt(idempotencyKeys.createdAt, staleBefore),
                ),
            )
            .returning({ key: idempotencyKeys.key });

        return taken.length > 0 ? { state: 'claimed' } : { state: 'in_flight' };
    }

    async complete(userId: string, key: string, status: number, body: unknown): Promise<void> {
        await this.db
            .update(idempotencyKeys)
            .set({ responseStatus: status, responseBody: body ?? null })
            .where(and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key)));
    }

    async release(userId: string, key: string): Promise<void> {
        await this.db
            .delete(idempotencyKeys)
            .where(and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key), isNull(idempotencyKeys.responseStatus)));
    }
}
