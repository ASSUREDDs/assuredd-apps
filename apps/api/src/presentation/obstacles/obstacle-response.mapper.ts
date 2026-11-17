import type { Obstacle } from '@app/contracts';

import type { ObstacleView } from '@domain/obstacles/obstacle.entity';

export function toObstacleResponse(view: ObstacleView): Obstacle {
    return {
        id: view.id,
        kind: view.kind,
        status: view.status,
        center: view.center,
        radiusM: view.radiusM,
        geometry: { type: 'Polygon', coordinates: view.geometry },
        comment: view.comment,
        createdBy: view.createdBy,
        createdAt: view.createdAt.toISOString(),
        expiresAt: view.expiresAt ? view.expiresAt.toISOString() : null,
        confirmations: view.confirmations,
        myVote: view.myVote,
    };
}
