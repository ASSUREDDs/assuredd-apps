import { Inject, Injectable } from '@nestjs/common';

import type { EntranceFinder, KnownEntrance } from '@domain/routing/entrance-finder';
import type { LngLat } from '@domain/shared/geo';
import { DrizzleEntranceRepository } from '@infrastructure/entrances/drizzle-entrance.repository';

@Injectable()
export class DrizzleEntranceFinder implements EntranceFinder {
    constructor(@Inject(DrizzleEntranceRepository) private readonly entrances: DrizzleEntranceRepository) {}

    async findNearest(tenantId: string, point: LngLat, radiusM: number): Promise<KnownEntrance | null> {
        const [nearest] = await this.entrances.searchNear(tenantId, point, radiusM, 1);
        return nearest ? { id: nearest.id, point: nearest.entrance } : null;
    }
}
