import { z } from 'zod';
import { API_URL } from '../config/env';

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly code?: string,
    ) {
        super(message);
    }
}

export const NoContentSchema = z.null();

interface RequestOptions extends RequestInit {
    accessToken?: string;
}

export async function request<T extends z.ZodType>(
    path: string,
    schema: T,
    init?: RequestOptions,
): Promise<z.infer<T>> {
    const { accessToken, headers, ...rest } = init ?? {};

    const res = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...headers,
        },
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
        throw new ApiError(res.status, body?.message ?? 'Request failed', body?.code);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new Error(`The response does not comply with the contract: ${parsed.error.issues[0].message}`);
    }

    return parsed.data;
}
