import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';

import {
    EmailAlreadyInUseError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    UserNotFoundError,
} from '@domain/auth/domain-error';
import type { DomainError } from '@domain/shared/domain-error';

@Injectable()
export class DomainErrorHttpMapper {
    toHttpException(error: DomainError): Error {
        const body = { code: error.code, message: error.message };

        if (error instanceof EmailAlreadyInUseError) return new ConflictException(body);
        if (error instanceof InvalidCredentialsError) return new UnauthorizedException(body);
        if (error instanceof InvalidRefreshTokenError) return new UnauthorizedException(body);
        if (error instanceof UserNotFoundError) return new UnauthorizedException(body);

        return new InternalServerErrorException('Unexpected error');
    }
}
