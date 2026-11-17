export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly code?: string,
    ) {
        super(message);
    }
}

/** No answer at all: offline, a dropped connection, or a request that timed out. */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof ApiError) return false;
    if (error instanceof Error) {
        // Only the messages fetch itself produces: a TypeError from our own code must not look like "offline".
        return error.name === 'AbortError' || /network request failed|failed to fetch|load failed|timed out/i.test(error.message);
    }
    return false;
}

/**
 * A failure that may go away by itself, so the same request is worth repeating later:
 * no network, a server error, or the server still busy with an earlier attempt of the same request.
 */
export function isTransientError(error: unknown): boolean {
    if (isNetworkError(error)) return true;
    if (error instanceof ApiError) {
        return error.status >= 500 || error.status === 408 || error.status === 429 || error.code === 'IDEMPOTENCY_IN_PROGRESS';
    }
    return false;
}
