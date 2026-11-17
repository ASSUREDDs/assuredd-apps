import type { CreateObstacleRequest, ObstacleVote } from '@app/contracts';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { fileStorage } from '@/shared/lib/file-storage';

interface QueuedBase {
    /** Local id of this entry. For a queued obstacle it is also what the map shows until the server answers. */
    id: string;
    /** The account that made the change: another account logging in on the same phone must not send it. */
    userId: string;
    createdAt: string;
    attempts: number;
}

/**
 * A change made without a connection. `idempotencyKey` is created when the courier makes the change and
 * reused on every retry, so a request that reached the server but lost its answer is never applied twice.
 */
export type QueuedAction =
    | (QueuedBase & { type: 'create'; idempotencyKey: string; input: CreateObstacleRequest })
    | (QueuedBase & { type: 'vote'; idempotencyKey: string; obstacleId: string; vote: ObstacleVote })
    | (QueuedBase & { type: 'remove'; obstacleId: string });

export type NewQueuedAction = QueuedAction extends infer A ? (A extends QueuedBase ? Omit<A, keyof QueuedBase> : never) : never;

interface OfflineQueueState {
    items: QueuedAction[];
    /** Changes the server refused for good (for example the obstacle area was invalid), not yet shown to the courier. */
    rejectedCount: number;
    /** Not persisted: true while a send is running. */
    isSyncing: boolean;
    enqueue: (userId: string, action: NewQueuedAction, id: string, now: Date) => void;
    remove: (id: string) => void;
    bumpAttempts: (id: string) => void;
    addRejected: (count: number) => void;
    clearRejected: () => void;
    setSyncing: (isSyncing: boolean) => void;
}

export const useOfflineQueue = create<OfflineQueueState>()(
    persist(
        (set) => ({
            items: [],
            rejectedCount: 0,
            isSyncing: false,
            enqueue: (userId, action, id, now) =>
                set((state) =>
                    // The same change queued twice (a double tap, a retried flow) is still one change.
                    state.items.some((item) => item.id === id)
                        ? state
                        : { items: [...state.items, { ...action, id, userId, createdAt: now.toISOString(), attempts: 0 } as QueuedAction] },
                ),
            remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
            bumpAttempts: (id) =>
                set((state) => ({ items: state.items.map((item) => (item.id === id ? { ...item, attempts: item.attempts + 1 } : item)) })),
            addRejected: (count) => set((state) => ({ rejectedCount: state.rejectedCount + count })),
            clearRejected: () => set({ rejectedCount: 0 }),
            setSyncing: (isSyncing) => set({ isSyncing }),
        }),
        {
            name: 'obstacle-queue',
            version: 1,
            storage: createJSONStorage(() => fileStorage),
            partialize: (state) => ({ items: state.items, rejectedCount: state.rejectedCount }),
        },
    ),
);

