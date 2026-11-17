import type { Obstacle } from '@app/contracts';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { fileStorage } from '@/shared/lib/file-storage';
import type { Bounds } from '@/shared/lib/geo';

import { type KnownObstacles, mergeKnown, sameKnown } from '../lib/known-obstacles';

interface KnownObstaclesState {
    /** The last obstacles seen on screen, by id, so the map is not empty when the connection is gone. */
    items: KnownObstacles;
    /** The server answered for `bounds`: replace what we knew about that area with `list`. */
    merge: (bounds: Bounds, list: Obstacle[], now: Date) => void;
    drop: (id: string) => void;
    update: (id: string, change: (obstacle: Obstacle) => Obstacle) => void;
}

export const useKnownObstacles = create<KnownObstaclesState>()(
    persist(
        (set) => ({
            items: {},
            merge: (bounds, list, now) =>
                set((state) => {
                    const next = mergeKnown(state.items, bounds, list, now);
                    // The list is refetched every 30 s; do not rewrite the file when nothing changed.
                    return sameKnown(state.items, next) ? state : { items: next };
                }),
            update: (id, change) =>
                set((state) => (id in state.items ? { items: { ...state.items, [id]: change(state.items[id]) } } : state)),
            drop: (id) =>
                set((state) =>
                    id in state.items ? { items: Object.fromEntries(Object.entries(state.items).filter(([key]) => key !== id)) } : state,
                ),
        }),
        {
            name: 'known-obstacles',
            version: 1,
            storage: createJSONStorage(() => fileStorage),
        },
    ),
);
