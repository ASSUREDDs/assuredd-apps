import { DomainError } from '@domain/shared/domain-error';

export class ObstacleNotFoundError extends DomainError {
    constructor() {
        super('OBSTACLE_NOT_FOUND', 'Obstacle not found');
    }
}

export class InvalidObstacleGeometryError extends DomainError {
    constructor() {
        super('INVALID_OBSTACLE_GEOMETRY', 'Obstacle shape is invalid or too large');
    }
}
