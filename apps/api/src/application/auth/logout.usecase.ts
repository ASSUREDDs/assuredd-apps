import { Inject, Injectable } from '@nestjs/common';

import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from '@domain/auth/refresh-token.repository';

import { TOKEN_SERVICE, type TokenService } from './ports/token.port';

@Injectable()
export class LogoutUseCase {
    constructor(
        @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
        @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    ) {}

    async execute(refreshToken: string): Promise<void> {
        const { tokenId } = this.tokens.parseRefreshToken(refreshToken);
        await this.refreshTokens.revoke(tokenId);
    }
}
