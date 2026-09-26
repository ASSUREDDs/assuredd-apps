import type { User } from '@app/contracts';

import type { PublicUser } from '@domain/auth/user.entity';
import type { AuthSession } from '@application/auth/auth-session';

interface AuthResponsePayload {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export function toUserResponse(user: PublicUser): User {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        gender: user.gender,
        address: user.address,
    };
}

export function toAuthResponse(session: AuthSession): AuthResponsePayload {
    return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: toUserResponse(session.user),
    };
}
