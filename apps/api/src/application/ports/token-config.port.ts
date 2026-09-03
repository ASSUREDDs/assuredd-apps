export interface TokenConfig {
    readonly accessTtlSec: number;
    readonly refreshTtlSec: number;
}
export const TOKEN_CONFIG = Symbol('TokenConfig');