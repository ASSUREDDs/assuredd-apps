import { DomainError } from '@domain/shared/domain-error';

export class InvalidCredentialsError extends DomainError {
    constructor() {
        super('Invalid email or password');
    }
}

export class EmailAlreadyInUseError extends DomainError {
    constructor() {
        super('Email is already in use');
    }
}

export class InvalidRefreshTokenError extends DomainError {
    constructor() {
        super('Invalid refresh token');
    }
}
