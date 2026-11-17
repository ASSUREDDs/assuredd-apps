import type { Obstacle, ObstacleKind } from '@app/contracts';

import type { Bounds } from '@/shared/lib/geo';

/** How many obstacles are remembered between sessions. The nearest areas the courier looked at stay; the rest age out. */
export const MAX_KNOWN = 400;

export type KnownObstacles = Record<string, Obstacle>;

const isInside = (point: [number, number], bounds: Bounds) =>
    point[0] >= bounds.west && point[0] <= bounds.east && point[1] >= bounds.south && point[1] <= bounds.north;

export const isStillActive = (obstacle: Obstacle, now: Date): boolean =>
    obstacle.status === 'active' && (obstacle.expiresAt === null || new Date(obstacle.expiresAt) > now);

/**
 * The server answered for `bounds` with `list`: that is the truth for the area. Anything remembered inside it
 * that is not in the answer was removed or expired. Everything outside the area is kept (unless it expired).
 */
export function mergeKnown(known: KnownObstacles, bounds: Bounds, list: Obstacle[], now: Date): KnownObstacles {
    const next: KnownObstacles = {};

    for (const [id, obstacle] of Object.entries(known)) {
        if (!isInside(obstacle.center, bounds) && isStillActive(obstacle, now)) next[id] = obstacle;
    }
    for (const obstacle of list) next[obstacle.id] = obstacle;

    const entries = Object.entries(next);
    if (entries.length <= MAX_KNOWN) return next;

    entries.sort(([, a], [, b]) => b.createdAt.localeCompare(a.createdAt));
    return Object.fromEntries(entries.slice(0, MAX_KNOWN));
}

export function sameKnown(a: KnownObstacles, b: KnownObstacles): boolean {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((id) => id in b && JSON.stringify(a[id]) === JSON.stringify(b[id]));
}

/** The remembered obstacles that are still active and fall inside the area and filter, newest first. */
export function knownObstaclesIn(known: KnownObstacles, bounds: Bounds, kinds: ObstacleKind[], now: Date): Obstacle[] {
    return Object.values(known)
        .filter((o) => kinds.includes(o.kind) && isInside(o.center, bounds) && isStillActive(o, now))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
