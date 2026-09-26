const MESSAGES: Record<string, string> = {
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_ALREADY_IN_USE: 'This email is already registered',
    INVALID_REFRESH_TOKEN: 'Your session has expired, please log in again',
    USER_NOT_FOUND: 'Your session has expired, please log in again',
};

const FALLBACK_MESSAGE = 'Something went wrong, please try again';

export function getAuthErrorMessage(code: string | undefined): string {
    if (!code) return FALLBACK_MESSAGE;
    return MESSAGES[code] ?? FALLBACK_MESSAGE;
}
