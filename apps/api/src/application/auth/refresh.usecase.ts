import { Inject, Injectable } from '@nestjs/common';

import { InvalidRefreshTokenError } from '@domain/auth/domain-error';
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from '@domain/auth/refresh-token.repository';
import { USER_REPOSITORY, type UserRepository } from '@domain/auth/user.repository';
import { err, ok, type Result } from '@domain/shared/result';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';

import type { AuthSession } from './auth-session';
import { TOKEN_SERVICE, type TokenService } from './ports/token.port';
import { SessionIssuer } from './session-issuer';

export type RefreshTokenPair = Pick<AuthSession, 'accessToken' | 'refreshToken'>;

@Injectable()
export class RefreshUseCase {
    constructor(
        @Inject(USER_REPOSITORY) private readonly usersRepository: UserRepository,
        @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokensRepository: RefreshTokenRepository,
        @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
        @Inject(CLOCK) private readonly clock: Clock,
        private readonly sessionIssuer: SessionIssuer,
    ) {}

    async execute(refreshToken: string): Promise<Result<RefreshTokenPair, InvalidRefreshTokenError>> {
        const { tokenId, secret } = this.tokens.parseRefreshToken(refreshToken);
        const stored = await this.refreshTokensRepository.findById(tokenId);
        if (!stored) return err(new InvalidRefreshTokenError());

        if (stored.revokedAt) {
            await this.refreshTokensRepository.revokeAllForUser(stored.userId);
            return err(new InvalidRefreshTokenError());
        }

        if (stored.expiresAt.getTime() < this.clock.now().getTime()) {
            return err(new InvalidRefreshTokenError());
        }

        if (this.tokens.hashRefreshTokenSecret(secret) !== stored.tokenHash) {
            return err(new InvalidRefreshTokenError());
        }

        const user = await this.usersRepository.findById(stored.userId);
        if (!user) return err(new InvalidRefreshTokenError());

        const session = await this.sessionIssuer.issue(user);
        await this.refreshTokensRepository.revoke(stored.id, session.refreshTokenId);

        return ok({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    }
}
