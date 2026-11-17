import type { ObstacleKind } from '@app/contracts';

import { circleRing, type LngLat } from '@/shared/lib/geo';

import type { QueuedAction } from '../model/offline-queue.store';

/** An obstacle added offline that the server has not seen yet. Drawn on the map as "waiting". */
export interface PendingObstacle {
    id: string;
    kind: ObstacleKind;
    comment: string | null;
    center: LngLat;
    radiusM: number;
    ring: LngLat[];
}

export function toPendingObstacles(items: QueuedAction[], userId: string | null): PendingObstacle[] {
    if (!userId) return [];

    const pending: PendingObstacle[] = [];
    for (const item of items) {
        if (item.type !== 'create' || item.userId !== userId) continue;

        const { shape, kind, comment } = item.input;
        const center = shape.type === 'circle' ? shape.center : (shape.polygon.coordinates[0][0] as LngLat);
        const radiusM = shape.type === 'circle' ? shape.radiusM : 0;
        pending.push({
            id: item.id,
            kind,
            comment: comment ?? null,
            center,
            radiusM,
            ring: shape.type === 'circle' ? circleRing(center, radiusM) : (shape.polygon.coordinates[0] as LngLat[]),
        });
    }
    return pending;
}

