import { Inject, Injectable } from '@nestjs/common';

import { EmailAlreadyInUseError } from '@domain/auth/domain-error';
import { normalizeEmail } from '@domain/auth/email.vo';
import type { User } from '@domain/auth/user.entity';
import { USER_REPOSITORY, type UserRepository } from '@domain/auth/user.repository';
import { err, ok, type Result } from '@domain/shared/result';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';
import { ID_GENERATOR, type IdGenerator } from '@application/shared/ports/id-generator.port';

import type { AuthSession } from './auth-session';
import { PASSWORD_HASHER, type PasswordHasher } from './ports/password-hasher.port';
import { SessionIssuer } from './session-issuer';

export type RegisterInput = Omit<User, 'id' | 'passwordHash' | 'createdAt'> & { password: string };

@Injectable()
export class RegisterUseCase {
    constructor(
        @Inject(USER_REPOSITORY) private readonly usersRepository: UserRepository,
        @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
        @Inject(CLOCK) private readonly clock: Clock,
        @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
        private readonly sessionIssuer: SessionIssuer,
    ) {}

    async execute(input: RegisterInput): Promise<Result<AuthSession, EmailAlreadyInUseError>> {
        const email = normalizeEmail(input.email);
        const existing = await this.usersRepository.findByEmail(email);
        if (existing) return err(new EmailAlreadyInUseError());

        const user: User = {
            id: this.ids.generate(),
            email,
            passwordHash: await this.passwordHasher.hash(input.password),
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            gender: input.gender,
            address: input.address,
            createdAt: this.clock.now(),
        };
        await this.usersRepository.save(user);

        return ok(await this.sessionIssuer.issue(user));
    }
}
