import {
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    ServiceUnavailableException,
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';

import {
    EmailAlreadyInUseError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    UserNotFoundError,
} from '@domain/auth/domain-error';
import { EntranceNotFoundError } from '@domain/entrances/domain-error';
import { InvalidObstacleGeometryError, ObstacleNotFoundError } from '@domain/obstacles/domain-error';
import {
    RouteBlockedError,
    RouteNotFoundError,
    RouteTooLongError,
    RoutingUnavailableError,
} from '@domain/routing/domain-error';
import type { DomainError } from '@domain/shared/domain-error';
import { ForbiddenError } from '@domain/shared/forbidden.error';
import { VisitIdTakenError, VisitNotFoundError } from '@domain/visits/domain-error';

@Injectable()
export class DomainErrorHttpMapper {
    toHttpException(error: DomainError): Error {
        const body = { code: error.code, message: error.message };

        if (error instanceof EmailAlreadyInUseError) return new ConflictException(body);
        if (error instanceof InvalidCredentialsError) return new UnauthorizedException(body);
        if (error instanceof InvalidRefreshTokenError) return new UnauthorizedException(body);
        if (error instanceof UserNotFoundError) return new UnauthorizedException(body);

        if (error instanceof ObstacleNotFoundError) return new NotFoundException(body);
        if (error instanceof EntranceNotFoundError) return new NotFoundException(body);
        if (error instanceof InvalidObstacleGeometryError) return new UnprocessableEntityException(body);
        if (error instanceof RouteNotFoundError) return new NotFoundException(body);
        if (error instanceof RouteBlockedError)
            return new UnprocessableEntityException({ ...body, obstacleIds: error.obstacleIds });
        if (error instanceof RouteTooLongError) return new UnprocessableEntityException(body);
        if (error instanceof RoutingUnavailableError) return new ServiceUnavailableException(body);
        if (error instanceof VisitNotFoundError) return new NotFoundException(body);
        if (error instanceof VisitIdTakenError) return new ConflictException(body);
        if (error instanceof ForbiddenError) return new ForbiddenException(body);

        return new InternalServerErrorException('Unexpected error');
    }
}
