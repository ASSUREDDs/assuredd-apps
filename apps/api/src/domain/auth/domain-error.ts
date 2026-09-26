import { DomainError } from '@domain/shared/domain-error';

export const AuthErrorCode = {
    InvalidCredentials: 'INVALID_CREDENTIALS',
    EmailAlreadyInUse: 'EMAIL_ALREADY_IN_USE',
    InvalidRefreshToken: 'INVALID_REFRESH_TOKEN',
    UserNotFound: 'USER_NOT_FOUND',
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

export class InvalidCredentialsError extends DomainError {
    constructor() {
        super(AuthErrorCode.InvalidCredentials, 'Invalid email or password');
    }
}

export class EmailAlreadyInUseError extends DomainError {
    constructor() {
        super(AuthErrorCode.EmailAlreadyInUse, 'Email is already in use');
    }
}

export class InvalidRefreshTokenError extends DomainError {
    constructor() {
        super(AuthErrorCode.InvalidRefreshToken, 'Invalid refresh token');
    }
}

export class UserNotFoundError extends DomainError {
    constructor() {
        super(AuthErrorCode.UserNotFound, 'User not found');
    }
}
