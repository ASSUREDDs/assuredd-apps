import { Module } from '@nestjs/common';

import { REFRESH_TOKEN_REPOSITORY } from '@domain/auth/refresh-token.repository';
import { USER_REPOSITORY } from '@domain/auth/user.repository';
import { GetCurrentUserUseCase } from '@application/auth/get-current-user.usecase';
import { LoginUseCase } from '@application/auth/login.usecase';
import { LogoutUseCase } from '@application/auth/logout.usecase';
import { PASSWORD_HASHER } from '@application/auth/ports/password-hasher.port';
import { TOKEN_SERVICE } from '@application/auth/ports/token.port';
import { RefreshUseCase } from '@application/auth/refresh.usecase';
import { RegisterUseCase } from '@application/auth/register.usecase';
import { SessionIssuer } from '@application/auth/session-issuer';
import { CLOCK } from '@application/shared/ports/clock.port';
import { ID_GENERATOR } from '@application/shared/ports/id-generator.port';
import { ArgonHasher } from '@infrastructure/auth/argon-hasher';
import { DrizzleRefreshTokenRepository } from '@infrastructure/auth/drizzle-refresh-token.repository';
import { DrizzleUserRepository } from '@infrastructure/auth/drizzle-user.repository';
import { JwtTokenService } from '@infrastructure/auth/jwt-token.service';
import { CryptoIdGenerator } from '@infrastructure/shared/crypto-id-generator';
import { SystemClock } from '@infrastructure/shared/system-clock';

import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
    controllers: [AuthController],
    providers: [
        RegisterUseCase,
        LoginUseCase,
        RefreshUseCase,
        LogoutUseCase,
        GetCurrentUserUseCase,
        SessionIssuer,
        DomainErrorHttpMapper,
        JwtAuthGuard,
        { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
        { provide: REFRESH_TOKEN_REPOSITORY, useClass: DrizzleRefreshTokenRepository },
        { provide: PASSWORD_HASHER, useClass: ArgonHasher },
        { provide: TOKEN_SERVICE, useClass: JwtTokenService },
        { provide: CLOCK, useClass: SystemClock },
        { provide: ID_GENERATOR, useClass: CryptoIdGenerator },
    ],
    exports: [JwtAuthGuard],
})
export class AuthModule {}
