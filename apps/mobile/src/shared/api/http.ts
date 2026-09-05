import type { z } from 'zod';
import { API_URL } from '../config/env';

export class ApiError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
    }
}

export async function request<T extends z.ZodType>(
    path: string,
    schema: T,
    init?: RequestInit,
): Promise<z.infer<T>> {
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
        throw new ApiError(res.status, body?.message ?? 'Request failed');
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new Error(`The response does not comply with the contract: ${parsed.error.issues[0].message}`);
    }

    return parsed.data;
}