import {
    LoginResponseSchema,
    RegisterResponseSchema,
    type LoginRequest,
    type LoginResponse,
    type RegisterRequest,
    type RegisterResponse,
} from '@app/contracts';

import { authorizedRequest } from '@/shared/api/authorized-request';
import { NoContentSchema, request } from '@/shared/api/http';
import { getTokens } from '@/shared/api/token-storage';

export function registerRequest(input: RegisterRequest): Promise<RegisterResponse> {
    return request('/auth/register', RegisterResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function loginRequest(input: LoginRequest): Promise<LoginResponse> {
    return request('/auth/login', LoginResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function logoutRequest(): Promise<void> {
    const tokens = await getTokens();
    if (!tokens) return;

    await authorizedRequest('/auth/logout', NoContentSchema, {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
}
