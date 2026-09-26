import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
    AccessTokenPayload,
    IssuedRefreshToken,
    ParsedRefreshToken,
    TokenService,
} from '@application/auth/ports/token.port';
import type { Env } from '@infrastructure/config';

@Injectable()
export class JwtTokenService implements TokenService {
    constructor(private readonly config: ConfigService<Env, true>) {}

    signAccessToken(payload: AccessTokenPayload): string {
        return jwt.sign(payload, this.config.get('ACCESS_TOKEN_SECRET', { infer: true }), {
            expiresIn: this.config.get('ACCESS_TTL_SEC', { infer: true }),
        });
    }

    verifyAccessToken(token: string): AccessTokenPayload {
        return jwt.verify(token, this.config.get('ACCESS_TOKEN_SECRET', { infer: true })) as AccessTokenPayload;
    }

    issueRefreshToken(): IssuedRefreshToken {
        const tokenId = randomUUID();
        const secret = randomBytes(32).toString('hex');
        const ttlSec = this.config.get('REFRESH_TTL_SEC', { infer: true });

        return {
            tokenId,
            token: `${tokenId}.${secret}`,
            tokenHash: this.hashRefreshTokenSecret(secret),
            expiresAt: new Date(Date.now() + ttlSec * 1000),
        };
    }

    parseRefreshToken(token: string): ParsedRefreshToken {
        const separatorIndex = token.indexOf('.');
        if (separatorIndex === -1) return { tokenId: '', secret: '' };

        return {
            tokenId: token.slice(0, separatorIndex),
            secret: token.slice(separatorIndex + 1),
        };
    }

    hashRefreshTokenSecret(secret: string): string {
        return createHmac('sha256', this.config.get('REFRESH_TOKEN_SECRET', { infer: true }))
            .update(secret)
            .digest('hex');
    }
}
