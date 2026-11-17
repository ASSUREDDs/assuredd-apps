import { DomainError } from '@domain/shared/domain-error';

export class VisitNotFoundError extends DomainError {
    constructor() {
        super('VISIT_NOT_FOUND', 'Visit not found');
    }
}

export class VisitIdTakenError extends DomainError {
    constructor() {
        super('VISIT_ID_TAKEN', 'This visit id is already in use');
    }
}
