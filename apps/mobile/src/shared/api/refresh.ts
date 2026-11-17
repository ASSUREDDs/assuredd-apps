import { RefreshResponseSchema } from '@app/contracts';

import { ApiError, request } from './http';
import { clearTokens, getTokens, setTokens } from './token-storage';

/** The server looked at the refresh token and refused it: the session is really over. */
function isRejectedByServer(error: unknown): boolean {
    return error instanceof ApiError && (error.status === 400 || error.status === 401 || error.status === 403);
}

export async function refreshTokens(): Promise<string> {
    const tokens = await getTokens();
    if (!tokens) {
        throw new Error('No refresh token available');
    }

    try {
        const response = await request('/auth/refresh', RefreshResponseSchema, {
            method: 'POST',
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });

        await setTokens(response);
        return response.accessToken;
    } catch (error) {
        // Being offline must not log the courier out: only a refusal from the server ends the session.
        if (isRejectedByServer(error)) await clearTokens();
        throw error;
    }
}
