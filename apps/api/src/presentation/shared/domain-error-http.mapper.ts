import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';

import { EmailAlreadyInUseError, InvalidCredentialsError, InvalidRefreshTokenError } from '@domain/auth/domain-error';
import type { DomainError } from '@domain/shared/domain-error';

@Injectable()
export class DomainErrorHttpMapper {
    toHttpException(error: DomainError): Error {
        if (error instanceof EmailAlreadyInUseError) return new ConflictException(error.message);
        if (error instanceof InvalidCredentialsError) return new UnauthorizedException(error.message);
        if (error instanceof InvalidRefreshTokenError) return new UnauthorizedException(error.message);

        return new InternalServerErrorException('Unexpected error');
    }
}
