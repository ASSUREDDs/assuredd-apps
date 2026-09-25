import { Inject, Injectable } from '@nestjs/common';

import { InvalidCredentialsError } from '@domain/auth/domain-error';
import { normalizeEmail } from '@domain/auth/email.vo';
import { USER_REPOSITORY, type UserRepository } from '@domain/auth/user.repository';
import { err, ok, type Result } from '@domain/shared/result';

import type { AuthSession } from './auth-session';
import { PASSWORD_HASHER, type PasswordHasher } from './ports/password-hasher.port';
import { SessionIssuer } from './session-issuer';

export interface LoginInput {
    email: string;
    password: string;
}

@Injectable()
export class LoginUseCase {
    constructor(
        @Inject(USER_REPOSITORY) private readonly users: UserRepository,
        @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
        private readonly sessionIssuer: SessionIssuer,
    ) {}

    async execute(input: LoginInput): Promise<Result<AuthSession, InvalidCredentialsError>> {
        const user = await this.users.findByEmail(normalizeEmail(input.email));
        if (!user) return err(new InvalidCredentialsError());

        const passwordMatches = await this.passwordHasher.verify(input.password, user.passwordHash);
        if (!passwordMatches) return err(new InvalidCredentialsError());

        return ok(await this.sessionIssuer.issue(user));
    }
}
