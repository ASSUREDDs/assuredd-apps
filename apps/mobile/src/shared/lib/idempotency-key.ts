/**
 * Unique key for one logical write. Generated once when the user starts the action and reused
 * on every retry of it, so the server never creates the same thing twice. Uniqueness matters here,
 * not cryptographic strength.
 */
export function createIdempotencyKey(): string {
    const random = Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 10)).join('');
    return `${Date.now().toString(36)}-${random}`;
}
