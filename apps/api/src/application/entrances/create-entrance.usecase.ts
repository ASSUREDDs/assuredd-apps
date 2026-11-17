import { Inject, Injectable } from '@nestjs/common';

import type { Entrance } from '@domain/entrances/entrance.entity';
import { ENTRANCE_REPOSITORY, type EntranceRepository } from '@domain/entrances/entrance.repository';
import type { LngLat } from '@domain/shared/geo';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';
import { ID_GENERATOR, type IdGenerator } from '@application/shared/ports/id-generator.port';

export interface CreateEntranceInput {
    tenantId: string;
    userId: string;
    house: LngLat;
    entrance: LngLat;
    label?: string;
    comment?: string;
}

@Injectable()
export class CreateEntranceUseCase {
    constructor(
        @Inject(ENTRANCE_REPOSITORY) private readonly entrances: EntranceRepository,
        @Inject(CLOCK) private readonly clock: Clock,
        @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    ) {}

    async execute(input: CreateEntranceInput): Promise<Entrance> {
        const created: Entrance = {
            id: this.ids.generate(),
            house: input.house,
            entrance: input.entrance,
            label: input.label?.length ? input.label : null,
            comment: input.comment?.length ? input.comment : null,
            createdBy: input.userId,
            createdAt: this.clock.now(),
        };

        await this.entrances.create({ ...created, tenantId: input.tenantId });
        return created;
    }
}
