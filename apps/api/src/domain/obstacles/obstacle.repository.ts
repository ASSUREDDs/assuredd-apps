import type { LngLat } from '@domain/shared/geo';

import type {
    NewObstacle,
    ObstacleKind,
    ObstacleStatus,
    ObstacleView,
    ObstacleVote,
    RemovalReason,
} from './obstacle.entity';

export type SearchArea =
    | { type: 'bbox'; west: number; south: number; east: number; north: number }
    | { type: 'radius'; center: LngLat; radiusM: number };

export interface ObstacleSearch {
    tenantId: string;
    userId: string;
    area: SearchArea;
    kinds?: ObstacleKind[];
    now: Date;
    limit: number;
}

export interface ObstacleRepository {
    /** Returns false when the shape is not a valid polygon or exceeds `maxAreaM2`. Nothing is stored then. */
    create(obstacle: NewObstacle, maxAreaM2: number): Promise<boolean>;
    /** Any status; callers decide whether a removed or expired obstacle counts as found. */
    findView(tenantId: string, userId: string, id: string): Promise<ObstacleView | null>;
    /** Only active, non-expired obstacles. */
    search(query: ObstacleSearch): Promise<ObstacleView[]>;
    /** One mark per courier per obstacle: a second call changes the existing mark. */
    upsertVote(obstacleId: string, userId: string, vote: ObstacleVote, now: Date): Promise<void>;
    extendExpiry(obstacleId: string, expiresAt: Date): Promise<void>;
    markInactive(obstacleId: string, status: ObstacleStatus, reason: RemovalReason, now: Date): Promise<void>;
    /** Marks active obstacles whose `expiresAt` has passed. Returns how many. */
    expireDue(now: Date): Promise<number>;
}

export const OBSTACLE_REPOSITORY = Symbol('ObstacleRepository');
