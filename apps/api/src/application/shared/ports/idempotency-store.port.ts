export type IdempotencyClaim =
    | { state: 'claimed' }
    | { state: 'replay'; status: number; body: unknown }
    | { state: 'in_flight' }
    | { state: 'mismatch' };

export interface IdempotencyStore {
    /** Atomically reserves the key for this user, or tells what already happened with it. */
    claim(userId: string, key: string, requestHash: string): Promise<IdempotencyClaim>;
    /** Stores the response so retries with the same key replay it. */
    complete(userId: string, key: string, status: number, body: unknown): Promise<void>;
    /** Frees the key after a failed request so the client can retry. */
    release(userId: string, key: string): Promise<void>;
}

export const IDEMPOTENCY_STORE = Symbol('IdempotencyStore');
