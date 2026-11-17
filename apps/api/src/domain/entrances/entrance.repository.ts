import type { LngLat } from '@domain/shared/geo';

import type { Entrance, NewEntrance } from './entrance.entity';

export interface EntranceRepository {
    create(entrance: NewEntrance): Promise<void>;
    findById(tenantId: string, id: string): Promise<Entrance | null>;
    /** Entrances whose house point is within `radiusM` meters of `center`, nearest first. */
    searchNear(tenantId: string, center: LngLat, radiusM: number, limit: number): Promise<Entrance[]>;
    delete(id: string): Promise<void>;
}

export const ENTRANCE_REPOSITORY = Symbol('EntranceRepository');
