import { eq } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';

import type { RefreshToken } from '@domain/auth/refresh-token.entity';
import type { RefreshTokenRepository } from '@domain/auth/refresh-token.repository';
import { type Database, DB } from '@infrastructure/db';
import { refreshTokens } from '@infrastructure/db/schema';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
    constructor(@Inject(DB) private readonly db: Database) {}

    async save(token: RefreshToken): Promise<void> {
        await this.db.insert(refreshTokens).values({
            id: token.id,
            userId: token.userId,
            tokenHash: token.tokenHash,
            expiresAt: token.expiresAt,
            revokedAt: token.revokedAt,
            replacedByTokenId: token.replacedByTokenId,
            createdAt: token.createdAt,
        });
    }

    async findById(id: string): Promise<RefreshToken | null> {
        if (!UUID_PATTERN.test(id)) return null;

        const [row] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.id, id)).limit(1);
        return row ?? null;
    }

    async revoke(id: string, replacedByTokenId?: string): Promise<void> {
        if (!UUID_PATTERN.test(id)) return;

        await this.db
            .update(refreshTokens)
            .set({ revokedAt: new Date(), replacedByTokenId: replacedByTokenId ?? null })
            .where(eq(refreshTokens.id, id));
    }

    async revokeAllForUser(userId: string): Promise<void> {
        await this.db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, userId));
    }
}
