import { Inject, Injectable } from '@nestjs/common';

import type { Entrance } from '@domain/entrances/entrance.entity';
import { ENTRANCE_REPOSITORY, type EntranceRepository } from '@domain/entrances/entrance.repository';
import type { LngLat } from '@domain/shared/geo';

const SEARCH_LIMIT = 20;

@Injectable()
export class SearchEntrancesUseCase {
    constructor(@Inject(ENTRANCE_REPOSITORY) private readonly entrances: EntranceRepository) {}

    execute(tenantId: string, center: LngLat, radiusM: number): Promise<Entrance[]> {
        return this.entrances.searchNear(tenantId, center, radiusM, SEARCH_LIMIT);
    }
}
