import { DomainError } from '@domain/shared/domain-error';

export class EntranceNotFoundError extends DomainError {
    constructor() {
        super('ENTRANCE_NOT_FOUND', 'Entrance not found');
    }
}
