import type { LngLat } from '@domain/shared/geo';

export const ObstacleKind = {
    ClosedArch: 'closed_arch',
    Incident: 'incident',
} as const;
export type ObstacleKind = (typeof ObstacleKind)[keyof typeof ObstacleKind];

export const ObstacleStatus = {
    Active: 'active',
    Removed: 'removed',
    Expired: 'expired',
} as const;
export type ObstacleStatus = (typeof ObstacleStatus)[keyof typeof ObstacleStatus];

export const ObstacleVote = {
    StillRelevant: 'still_relevant',
    NoLongerRelevant: 'no_longer_relevant',
} as const;
export type ObstacleVote = (typeof ObstacleVote)[keyof typeof ObstacleVote];

export const RemovalReason = {
    Manual: 'manual',
    Dismissed: 'dismissed',
    Expired: 'expired',
} as const;
export type RemovalReason = (typeof RemovalReason)[keyof typeof RemovalReason];

export type ObstacleShape =
    | { type: 'circle'; center: LngLat; radiusM: number }
    | { type: 'polygon'; ring: LngLat[] };

export interface NewObstacle {
    id: string;
    tenantId: string;
    createdBy: string;
    kind: ObstacleKind;
    shape: ObstacleShape;
    comment: string | null;
    expiresAt: Date | null;
    createdAt: Date;
}

/** What the API shows: the stored obstacle plus votes. `geometry` is GeoJSON polygon rings. */
export interface ObstacleView {
    id: string;
    kind: ObstacleKind;
    status: ObstacleStatus;
    center: LngLat;
    radiusM: number | null;
    geometry: LngLat[][];
    comment: string | null;
    createdBy: string;
    createdAt: Date;
    expiresAt: Date | null;
    confirmations: { stillRelevant: number; noLongerRelevant: number };
    myVote: ObstacleVote | null;
}

export function isObstacleActive(obstacle: Pick<ObstacleView, 'status' | 'expiresAt'>, now: Date): boolean {
    if (obstacle.status !== ObstacleStatus.Active) return false;
    return obstacle.expiresAt === null || obstacle.expiresAt > now;
}
