import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { createObstacle, removeObstacle, voteObstacle } from '../api/obstacle.api';
import { toPendingObstacles } from '../lib/pending-obstacle';
import { flushQueue } from './flush-queue';
import { type QueuedAction, useOfflineQueue } from './offline-queue.store';
import { obstacleKeys } from './use-obstacles';

/** While changes are waiting, try to send them this often. Offline attempts fail fast, so this is cheap. */
const RETRY_INTERVAL_MS = 15_000;

async function send(action: QueuedAction): Promise<void> {
    switch (action.type) {
        case 'create':
            await createObstacle(action.input, action.idempotencyKey);
            return;
        case 'vote':
            await voteObstacle(action.obstacleId, action.vote, action.idempotencyKey);
            return;
        case 'remove':
            await removeObstacle(action.obstacleId);
            return;
    }
}

function useQueueHydrated(): boolean {
    const [hydrated, setHydrated] = useState(() => useOfflineQueue.persist.hasHydrated());

    useEffect(() => {
        if (useOfflineQueue.persist.hasHydrated()) setHydrated(true);
        return useOfflineQueue.persist.onFinishHydration(() => setHydrated(true));
    }, []);

    return hydrated;
}

/**
 * Sends the changes made without a connection. Mount it once for a logged-in user: it tries when the app opens,
 * when it comes back to the foreground, and every few seconds while something is waiting.
 */
export function useOfflineSync(userId: string | null) {
    const queryClient = useQueryClient();
    const hydrated = useQueueHydrated();
    const waiting = useOfflineQueue((state) => state.items.filter((item) => item.userId === userId).length);
    const isRunning = useRef(false);

    const flush = useCallback(async () => {
        if (!userId || isRunning.current) return;

        const mine = useOfflineQueue.getState().items.filter((item) => item.userId === userId);
        if (mine.length === 0) return;

        isRunning.current = true;
        useOfflineQueue.getState().setSyncing(true);

        try {
            const result = await flushQueue(mine, {
                send,
                onDone: (action) => useOfflineQueue.getState().remove(action.id),
                onRejected: (action) => {
                    useOfflineQueue.getState().remove(action.id);
                    useOfflineQueue.getState().addRejected(1);
                },
                onRetryLater: (action) => useOfflineQueue.getState().bumpAttempts(action.id),
            });

            if (result.delivered > 0 || result.rejected > 0) {
                await queryClient.invalidateQueries({ queryKey: obstacleKeys.all });
            }
        } finally {
            isRunning.current = false;
            useOfflineQueue.getState().setSyncing(false);
        }
    }, [userId, queryClient]);

    useEffect(() => {
        if (hydrated && userId) void flush();
    }, [hydrated, userId, flush]);

    useEffect(() => {
        if (!hydrated || waiting === 0) return;

        const interval = setInterval(() => void flush(), RETRY_INTERVAL_MS);
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') void flush();
        });

        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, [hydrated, waiting, flush]);
}

/** What the screen needs to show about the queue for the current courier. */
export function useQueueStatus(userId: string | null) {
    const items = useOfflineQueue((state) => state.items);
    const isSyncing = useOfflineQueue((state) => state.isSyncing);
    const rejectedCount = useOfflineQueue((state) => state.rejectedCount);

    const pendingObstacles = useMemo(() => toPendingObstacles(items, userId), [items, userId]);
    const waiting = useMemo(() => items.filter((item) => item.userId === userId).length, [items, userId]);

    return { waiting, isSyncing, rejectedCount, pendingObstacles };
}

/** Takes a change back out of the queue before it was sent (cancel an obstacle that is still waiting). */
export function cancelQueuedAction(id: string): void {
    useOfflineQueue.getState().remove(id);
}

export function dismissRejected(): void {
    useOfflineQueue.getState().clearRejected();
}
