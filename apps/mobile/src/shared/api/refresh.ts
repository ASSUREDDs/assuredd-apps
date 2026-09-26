import { RefreshResponseSchema } from '@app/contracts';

import { request } from './http';
import { clearTokens, getTokens, setTokens } from './token-storage';

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
        await clearTokens();
        throw error;
    }
}
