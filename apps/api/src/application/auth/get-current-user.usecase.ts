import { Inject, Injectable } from '@nestjs/common';

import { UserNotFoundError } from '@domain/auth/domain-error';
import { type PublicUser, toPublicUser } from '@domain/auth/user.entity';
import { USER_REPOSITORY, type UserRepository } from '@domain/auth/user.repository';
import { err, ok, type Result } from '@domain/shared/result';

@Injectable()
export class GetCurrentUserUseCase {
    constructor(@Inject(USER_REPOSITORY) private readonly usersRepository: UserRepository) {}

    async execute(userId: string): Promise<Result<PublicUser, UserNotFoundError>> {
        const user = await this.usersRepository.findById(userId);
        if (!user) return err(new UserNotFoundError());

        return ok(toPublicUser(user));
    }
}
