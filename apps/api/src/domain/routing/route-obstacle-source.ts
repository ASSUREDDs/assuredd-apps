import type { LngLat } from '@domain/shared/geo';

export type RouteObstacleKind = 'closed_arch' | 'incident';

/** What routing needs to know about an obstacle: where it is and what to show about it. */
export interface RouteObstacle {
    id: string;
    kind: RouteObstacleKind;
    comment: string | null;
    center: LngLat;
    /** Outer ring of the avoid zone. */
    ring: LngLat[];
}

/** Routing's own view of the obstacles of a client; the obstacles feature does not leak into routing. */
export interface RouteObstacleSource {
    /** Active obstacles whose zone covers any of the given points. */
    findAtPoints(tenantId: string, points: LngLat[], now: Date): Promise<RouteObstacle[]>;
    /** Active obstacles whose zone the line crosses, except the listed ids. */
    findCrossingLine(tenantId: string, line: LngLat[], now: Date, exceptIds: string[]): Promise<RouteObstacle[]>;
}

export const ROUTE_OBSTACLE_SOURCE = Symbol('RouteObstacleSource');
