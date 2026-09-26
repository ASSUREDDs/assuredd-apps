import type { z } from 'zod';

import { ApiError, request } from './http';
import { refreshTokens } from './refresh';
import { getTokens } from './token-storage';

let refreshPromise: Promise<string> | null = null;

function refreshOnce(): Promise<string> {
    if (!refreshPromise) {
        refreshPromise = refreshTokens().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

export async function authorizedRequest<T extends z.ZodType>(
    path: string,
    schema: T,
    init?: RequestInit,
): Promise<z.infer<T>> {
    const tokens = await getTokens();

    try {
        return await request(path, schema, { ...init, accessToken: tokens?.accessToken });
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            const accessToken = await refreshOnce();
            return request(path, schema, { ...init, accessToken });
        }
        throw error;
    }
}
