import { Inject, Injectable } from '@nestjs/common';

import { EntranceNotFoundError } from '@domain/entrances/domain-error';
import { ENTRANCE_REPOSITORY, type EntranceRepository } from '@domain/entrances/entrance.repository';
import { ForbiddenError } from '@domain/shared/forbidden.error';
import { err, ok, type Result } from '@domain/shared/result';

export interface RemoveEntranceInput {
    tenantId: string;
    userId: string;
    role: string;
    entranceId: string;
}

@Injectable()
export class RemoveEntranceUseCase {
    constructor(@Inject(ENTRANCE_REPOSITORY) private readonly entrances: EntranceRepository) {}

    async execute(input: RemoveEntranceInput): Promise<Result<void, EntranceNotFoundError | ForbiddenError>> {
        const current = await this.entrances.findById(input.tenantId, input.entranceId);
        if (!current) return err(new EntranceNotFoundError());

        if (current.createdBy !== input.userId && input.role !== 'admin') {
            return err(new ForbiddenError('Only the author or an admin can remove an entrance'));
        }

        await this.entrances.delete(input.entranceId);
        return ok(undefined);
    }
}
