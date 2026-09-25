import { Inject, Injectable } from '@nestjs/common';

import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from '@domain/auth/refresh-token.repository';
import { toPublicUser, type User } from '@domain/auth/user.entity';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';

import type { AuthSession } from './auth-session';
import { TOKEN_SERVICE, type TokenService } from './ports/token.port';

@Injectable()
export class SessionIssuer {
    constructor(
        @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
        @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
        @Inject(CLOCK) private readonly clock: Clock,
    ) {}

    async issue(user: User): Promise<AuthSession> {
        const accessToken = this.tokens.signAccessToken({ sub: user.id, email: user.email });
        const issued = this.tokens.issueRefreshToken();

        await this.refreshTokens.save({
            id: issued.tokenId,
            userId: user.id,
            tokenHash: issued.tokenHash,
            expiresAt: issued.expiresAt,
            revokedAt: null,
            replacedByTokenId: null,
            createdAt: this.clock.now(),
        });

        return {
            accessToken,
            refreshToken: issued.token,
            refreshTokenId: issued.tokenId,
            user: toPublicUser(user),
        };
    }
}
