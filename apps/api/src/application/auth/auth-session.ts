import type { PublicUser } from '@domain/auth/user.entity';

export interface AuthSession {
    accessToken: string;
    refreshToken: string;
    refreshTokenId: string;
    user: PublicUser;
}
