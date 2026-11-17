import type { ObstacleKind } from '@app/contracts';
import { create } from 'zustand';

import type { LngLat } from '@/shared/lib/geo';
import { createIdempotencyKey } from '@/shared/lib/idempotency-key';

export type DraftStep = 'idle' | 'kind' | 'place';

export const RADIUS_OPTIONS_M = [10, 20, 40] as const;
const DEFAULT_RADIUS_M = 15;

interface DraftState {
    step: DraftStep;
    kind: ObstacleKind | null;
    point: LngLat | null;
    radiusM: number;
    comment: string;
    /** Created when the user starts, kept for every retry of this one obstacle. */
    idempotencyKey: string | null;
    start: () => void;
    chooseKind: (kind: ObstacleKind) => void;
    setPoint: (point: LngLat) => void;
    setRadius: (radiusM: number) => void;
    setComment: (comment: string) => void;
    cancel: () => void;
}

const EMPTY = {
    step: 'idle' as DraftStep,
    kind: null,
    point: null,
    radiusM: DEFAULT_RADIUS_M,
    comment: '',
    idempotencyKey: null,
};

export const useObstacleDraft = create<DraftState>((set) => ({
    ...EMPTY,
    start: () => set({ ...EMPTY, step: 'kind', idempotencyKey: createIdempotencyKey() }),
    chooseKind: (kind) => set({ kind, step: 'place' }),
    setPoint: (point) => set({ point }),
    setRadius: (radiusM) => set({ radiusM }),
    setComment: (comment) => set({ comment }),
    cancel: () => set(EMPTY),
}));
