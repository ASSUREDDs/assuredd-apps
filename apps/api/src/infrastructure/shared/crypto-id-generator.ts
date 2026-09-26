import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type { IdGenerator } from '@application/shared/ports/id-generator.port';

@Injectable()
export class CryptoIdGenerator implements IdGenerator {
    generate(): string {
        return randomUUID();
    }
}
