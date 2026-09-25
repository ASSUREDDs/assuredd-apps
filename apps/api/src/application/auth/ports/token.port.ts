export interface AccessTokenPayload {
    sub: string;
    email: string;
}

export interface IssuedRefreshToken {
    tokenId: string;
    token: string;
    tokenHash: string;
    expiresAt: Date;
}

export interface ParsedRefreshToken {
    tokenId: string;
    secret: string;
}

export interface TokenService {
    signAccessToken(payload: AccessTokenPayload): string;
    verifyAccessToken(token: string): AccessTokenPayload;
    issueRefreshToken(): IssuedRefreshToken;
    parseRefreshToken(token: string): ParsedRefreshToken;
    hashRefreshTokenSecret(secret: string): string;
}

export const TOKEN_SERVICE = Symbol('TokenService');
