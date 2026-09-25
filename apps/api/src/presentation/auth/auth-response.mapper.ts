import type { User } from '@app/contracts';

import type { AuthSession } from '@application/auth/auth-session';

interface AuthResponsePayload {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export function toAuthResponse(session: AuthSession): AuthResponsePayload {
    return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: {
            id: session.user.id,
            email: session.user.email,
            firstName: session.user.firstName,
            lastName: session.user.lastName,
            phone: session.user.phone,
            gender: session.user.gender,
            address: session.user.address,
        },
    };
}
