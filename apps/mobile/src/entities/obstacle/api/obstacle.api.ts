import {
    IDEMPOTENCY_KEY_HEADER,
    ObstacleListResponseSchema,
    ObstacleSchema,
    type CreateObstacleRequest,
    type Obstacle,
    type ObstacleKind,
    type ObstacleVote,
} from '@app/contracts';

import { authorizedRequest } from '@/shared/api/authorized-request';
import { NoContentSchema } from '@/shared/api/http';
import type { Bounds } from '@/shared/lib/geo';

/** The server rejects areas wider than this (degrees); the app does not even ask. */
export const MAX_SEARCH_SPAN_DEG = 0.5;

export function isBoundsTooLarge(bounds: Bounds): boolean {
    return bounds.east - bounds.west > MAX_SEARCH_SPAN_DEG || bounds.north - bounds.south > MAX_SEARCH_SPAN_DEG;
}

export async function searchObstacles(bounds: Bounds, kinds: ObstacleKind[]): Promise<Obstacle[]> {
    const params = [`bbox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}`];
    if (kinds.length > 0) params.push(`kind=${kinds.join(',')}`);

    const response = await authorizedRequest(`/obstacles?${params.join('&')}`, ObstacleListResponseSchema);
    return response.items;
}

export function createObstacle(input: CreateObstacleRequest, idempotencyKey: string, timeoutMs?: number): Promise<Obstacle> {
    return authorizedRequest('/obstacles', ObstacleSchema, {
        method: 'POST',
        headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
        body: JSON.stringify(input),
        timeoutMs,
    });
}

export function voteObstacle(id: string, vote: ObstacleVote, idempotencyKey: string, timeoutMs?: number): Promise<Obstacle> {
    return authorizedRequest(`/obstacles/${id}/votes`, ObstacleSchema, {
        method: 'POST',
        headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
        body: JSON.stringify({ vote }),
        timeoutMs,
    });
}

export async function removeObstacle(id: string, timeoutMs?: number): Promise<void> {
    await authorizedRequest(`/obstacles/${id}`, NoContentSchema, { method: 'DELETE', timeoutMs });
}
