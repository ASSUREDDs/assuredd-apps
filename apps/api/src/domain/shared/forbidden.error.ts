import { DomainError } from './domain-error';

export class ForbiddenError extends DomainError {
    constructor(message = 'You are not allowed to do this') {
        super('FORBIDDEN', message);
    }
}
