/** Required on every mutating request that originates from the phone, so retries are safe. */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
