const ERROR_KEYS: Record<string, string> = {
    INVALID_CREDENTIALS: 'auth.errors.invalidCredentials',
    EMAIL_ALREADY_IN_USE: 'auth.errors.emailAlreadyInUse',
    INVALID_REFRESH_TOKEN: 'auth.errors.sessionExpired',
    USER_NOT_FOUND: 'auth.errors.sessionExpired',
};

const FALLBACK_KEY = 'auth.errors.generic';

/** Maps an API error code to its i18n key; pass the result to `t()`. */
export function getAuthErrorKey(code: string | undefined): string {
    if (!code) return FALLBACK_KEY;
    return ERROR_KEYS[code] ?? FALLBACK_KEY;
}
