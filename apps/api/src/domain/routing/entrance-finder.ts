import type { LngLat } from '@domain/shared/geo';

export interface KnownEntrance {
    id: string;
    point: LngLat;
}

export interface EntranceFinder {
    /** The known entrance of the house nearest to `point`, within `radiusM` meters, if any. */
    findNearest(tenantId: string, point: LngLat, radiusM: number): Promise<KnownEntrance | null>;
}

export const ENTRANCE_FINDER = Symbol('EntranceFinder');
