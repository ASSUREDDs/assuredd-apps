import type { CreateObstacleRequest, Obstacle, ObstacleKind, ObstacleVote } from '@app/contracts';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { isTransientError } from '@/shared/api/errors';
import { OBSTACLE_WRITE_KEY } from '@/shared/api/mutation-keys';
import type { Bounds } from '@/shared/lib/geo';
import { createIdempotencyKey } from '@/shared/lib/idempotency-key';

import { applyVote } from '../lib/apply-vote';
import { newLocalId } from '../lib/local-id';
import { createObstacle, isBoundsTooLarge, removeObstacle, searchObstacles, voteObstacle } from '../api/obstacle.api';
import { knownObstaclesIn } from '../lib/known-obstacles';
import { useKnownObstacles } from './known-obstacles.store';
import { useOfflineQueue } from './offline-queue.store';

const REFRESH_INTERVAL_MS = 30_000;
const COORDINATE_PRECISION = 1000;

export const obstacleKeys = {
    all: ['obstacles'] as const,
    search: (bounds: Bounds, kinds: ObstacleKind[]) => [...obstacleKeys.all, 'search', roundBounds(bounds), kinds] as const,
};

// Panning produces a new area every time; rounding keeps near-identical areas on one cache entry.
function roundBounds(bounds: Bounds): Bounds {
    const round = (value: number) => Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;
    return { west: round(bounds.west), south: round(bounds.south), east: round(bounds.east), north: round(bounds.north) };
}

// Ask for a bit more than the screen shows, so an obstacle at the edge (or under a panel) does not flicker away.
const SEARCH_PADDING = 0.25;

function padBounds(bounds: Bounds): Bounds {
    const padLng = (bounds.east - bounds.west) * SEARCH_PADDING;
    const padLat = (bounds.north - bounds.south) * SEARCH_PADDING;
    return { west: bounds.west - padLng, south: bounds.south - padLat, east: bounds.east + padLng, north: bounds.north + padLat };
}

export function useObstacles(visible: Bounds | null, kinds: ObstacleKind[]) {
    const tooLarge = visible ? isBoundsTooLarge(visible) : false;
    const bounds = visible ? padBounds(visible) : null;
    // The padded area may exceed the server limit even when the visible one does not; trim it back.
    const searchBounds = bounds && !isBoundsTooLarge(bounds) ? bounds : visible;

    const query = useQuery<Obstacle[]>({
        queryKey: searchBounds ? obstacleKeys.search(searchBounds, kinds) : obstacleKeys.all,
        queryFn: () => searchObstacles(searchBounds as Bounds, kinds),
        enabled: searchBounds !== null && !tooLarge && kinds.length > 0,
        refetchInterval: REFRESH_INTERVAL_MS,
        placeholderData: keepPreviousData,
    });

    // Every fresh answer from the server is remembered on the phone ...
    const merge = useKnownObstacles((state) => state.merge);
    const boundsRef = useRef(searchBounds);
    boundsRef.current = searchBounds;
    useEffect(() => {
        if (query.data && !query.isPlaceholderData && boundsRef.current) merge(boundsRef.current, query.data, new Date());
    }, [query.dataUpdatedAt, query.isPlaceholderData, query.data, merge]);

    // ... so that when there is no answer (offline, still loading, a failed request) the map shows what was last seen
    // instead of going empty.
    const known = useKnownObstacles((state) => state.items);
    const remembered = useMemo(
        () => (searchBounds ? knownObstaclesIn(known, searchBounds, kinds, new Date()) : []),
        [known, searchBounds, kinds],
    );

    return { ...query, obstacles: query.data ?? remembered, tooLarge };
}

function boundsOf(queryKey: readonly unknown[]): Bounds | null {
    const candidate = queryKey[2] as Bounds | undefined;
    return candidate && typeof candidate.west === 'number' ? candidate : null;
}

/** Puts an answer from the server straight into the lists on screen, before they are refetched. */
function useObstacleCache() {
    const queryClient = useQueryClient();

    return {
        add(created: Obstacle) {
            queryClient.setQueriesData<Obstacle[]>(
                {
                    queryKey: obstacleKeys.all,
                    predicate: (query) => {
                        const area = boundsOf(query.queryKey);
                        const kinds = query.queryKey[3] as ObstacleKind[] | undefined;
                        return (
                            area !== null &&
                            (kinds?.includes(created.kind) ?? false) &&
                            created.center[0] >= area.west &&
                            created.center[0] <= area.east &&
                            created.center[1] >= area.south &&
                            created.center[1] <= area.north
                        );
                    },
                },
                (list) => (list ? [created, ...list.filter((o) => o.id !== created.id)] : list),
            );
        },
        replace(updated: Obstacle) {
            queryClient.setQueriesData<Obstacle[]>({ queryKey: obstacleKeys.all }, (list) =>
                list?.map((o) => (o.id === updated.id ? updated : o)).filter((o) => o.status === 'active'),
            );
        },
        drop(id: string) {
            queryClient.setQueriesData<Obstacle[]>({ queryKey: obstacleKeys.all }, (list) => list?.filter((o) => o.id !== id));
            useKnownObstacles.getState().drop(id);
        },
        /** The courier's own mark, shown at once while it waits to be sent. */
        patchVote(id: string, vote: ObstacleVote) {
            queryClient.setQueriesData<Obstacle[]>({ queryKey: obstacleKeys.all }, (list) =>
                list?.map((o) => (o.id === id ? applyVote(o, vote) : o)),
            );
            useKnownObstacles.getState().update(id, (o) => applyVote(o, vote));
        },
        refresh: () => queryClient.invalidateQueries({ queryKey: obstacleKeys.all }),
    };
}

/** Writes that can wait for a connection give up quickly instead of making the courier stare at a loader. */
const QUEUEABLE_WRITE_TIMEOUT_MS = 8_000;

export function useCreateObstacle(userId: string | null) {
    const cache = useObstacleCache();

    return useMutation({
        mutationKey: OBSTACLE_WRITE_KEY,
        mutationFn: async ({
            input,
            idempotencyKey,
        }: {
            input: CreateObstacleRequest;
            idempotencyKey: string;
        }): Promise<{ created: Obstacle | null }> => {
            try {
                return { created: await createObstacle(input, idempotencyKey, QUEUEABLE_WRITE_TIMEOUT_MS) };
            } catch (error) {
                if (!userId || !isTransientError(error)) throw error;

                // No answer: keep it on the phone and send it later. The same key goes with every retry, so a
                // request that did reach the server (and only lost its reply) is not created a second time.
                useOfflineQueue.getState().enqueue(userId, { type: 'create', idempotencyKey, input }, newLocalId(idempotencyKey), new Date());
                return { created: null };
            }
        },
        onSuccess: async ({ created }) => {
            if (!created) return;
            cache.add(created);
            await cache.refresh();
        },
    });
}

export function useVoteObstacle(userId: string | null) {
    const cache = useObstacleCache();

    return useMutation({
        mutationKey: OBSTACLE_WRITE_KEY,
        mutationFn: async ({ id, vote }: { id: string; vote: ObstacleVote }): Promise<{ id: string; vote: ObstacleVote; updated: Obstacle | null }> => {
            const idempotencyKey = createIdempotencyKey();
            try {
                return { id, vote, updated: await voteObstacle(id, vote, idempotencyKey, QUEUEABLE_WRITE_TIMEOUT_MS) };
            } catch (error) {
                if (!userId || !isTransientError(error)) throw error;

                useOfflineQueue
                    .getState()
                    .enqueue(userId, { type: 'vote', idempotencyKey, obstacleId: id, vote }, `vote:${idempotencyKey}`, new Date());
                return { id, vote, updated: null };
            }
        },
        onSuccess: async ({ id, vote, updated }) => {
            if (!updated) {
                cache.patchVote(id, vote);
                return;
            }
            cache.replace(updated);
            await cache.refresh();
        },
    });
}

export function useRemoveObstacle(userId: string | null) {
    const cache = useObstacleCache();

    return useMutation({
        mutationKey: OBSTACLE_WRITE_KEY,
        mutationFn: async (id: string): Promise<{ id: string }> => {
            try {
                await removeObstacle(id, QUEUEABLE_WRITE_TIMEOUT_MS);
            } catch (error) {
                if (!userId || !isTransientError(error)) throw error;

                useOfflineQueue.getState().enqueue(userId, { type: 'remove', obstacleId: id }, `remove:${id}`, new Date());
            }
            return { id };
        },
        onSuccess: async ({ id }) => {
            cache.drop(id);
            await cache.refresh();
        },
    });
}
