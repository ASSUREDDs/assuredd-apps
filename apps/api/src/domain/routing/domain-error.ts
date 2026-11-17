import { DomainError } from '@domain/shared/domain-error';

export class RouteNotFoundError extends DomainError {
    constructor() {
        super('ROUTE_NOT_FOUND', 'No walking route between these points');
    }
}

export class RouteBlockedError extends DomainError {
    constructor(public readonly obstacleIds: string[]) {
        super('ROUTE_BLOCKED', 'The only walking routes go through active obstacles');
    }
}

export class RouteTooLongError extends DomainError {
    constructor() {
        super('ROUTE_TOO_LONG', 'Start and destination are too far apart');
    }
}

export class RoutingUnavailableError extends DomainError {
    constructor(message = 'Routing service is unavailable') {
        super('ROUTING_UNAVAILABLE', message);
    }
}
