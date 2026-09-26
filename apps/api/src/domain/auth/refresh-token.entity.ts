export interface RefreshToken {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedByTokenId: string | null;
    createdAt: Date;
}
