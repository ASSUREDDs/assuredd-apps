import * as argon2 from 'argon2';
import { Injectable } from '@nestjs/common';

import type { PasswordHasher } from '@application/auth/ports/password-hasher.port';

@Injectable()
export class ArgonHasher implements PasswordHasher {
    async hash(plain: string): Promise<string> {
        return argon2.hash(plain);
    }

    async verify(plain: string, hash: string): Promise<boolean> {
        return argon2.verify(hash, plain);
    }
}
