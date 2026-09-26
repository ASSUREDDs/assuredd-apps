import type { RefreshToken } from './refresh-token.entity';

export interface RefreshTokenRepository {
    save(token: RefreshToken): Promise<void>;
    findById(id: string): Promise<RefreshToken | null>;
    revoke(id: string, replacedByTokenId?: string): Promise<void>;
    revokeAllForUser(userId: string): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('RefreshTokenRepository');
