import { fileStorage } from '@/shared/lib/file-storage';
import type { LngLat } from '@/shared/lib/geo';

import type { BufferedPoint } from '../lib/tracking-logic';

export type VisitEventType = 'arrived_at_house' | 'reached_door' | 'cancelled';
export type VisitStatus = 'active' | 'completed' | 'cancelled';

export interface PendingEvent {
    type: VisitEventType;
    at: string;
}

/** One delivery visit as the phone knows it, with everything the server has not received yet. */
export interface TrackedVisit {
    visitId: string;
    userId: string;
    destination: LngLat;
    label: string | null;
    startedAt: string;
    status: VisitStatus;
    /** The server knows this visit exists. Events and points can only be sent after that. */
    startSent: boolean;
    /** First fix inside the zone around the address. */
    enteredAt: string | null;
    doorAt: string | null;
    lastRecordedAt: string | null;
    events: PendingEvent[];
    points: BufferedPoint[];
}

export interface TrackingState {
    visits: Record<string, TrackedVisit>;
    /** The visit the courier sees on screen; the others are only waiting to be delivered. */
    currentId: string | null;
}

const STORAGE_NAME = 'tracking-state';
const EMPTY: TrackingState = { visits: {}, currentId: null };

let snapshot: TrackingState = EMPTY;
let loaded: Promise<void> | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach((listener) => listener());
}

function isTrackingState(value: unknown): value is TrackingState {
    return typeof value === 'object' && value !== null && 'visits' in value && typeof (value as TrackingState).visits === 'object';
}

/** Reads the saved state once per JS runtime; later reads use memory. */
export function ensureLoaded(): Promise<void> {
    loaded ??= (async () => {
        try {
            const raw = await fileStorage.getItem(STORAGE_NAME);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            if (isTrackingState(parsed)) snapshot = parsed;
        } catch {
            // A damaged file is treated as empty rather than blocking tracking.
        }
        notify();
    })();
    return loaded;
}

export async function getState(): Promise<TrackingState> {
    await ensureLoaded();
    return snapshot;
}

/**
 * Changes the state. Changes run one after another (the background task and the screen can both write),
 * and each one is saved to disk before the next starts, so a crash loses at most the change in progress.
 */
export function updateState(change: (state: TrackingState) => TrackingState): Promise<TrackingState> {
    const run = queue.then(async () => {
        await ensureLoaded();
        const next = change(snapshot);
        if (next !== snapshot) {
            snapshot = next;
            await fileStorage.setItem(STORAGE_NAME, JSON.stringify(next));
            notify();
        }
        return snapshot;
    });
    queue = run.catch(() => undefined);
    return run;
}

export function updateVisit(visitId: string, change: (visit: TrackedVisit) => TrackedVisit): Promise<TrackingState> {
    return updateState((state) => {
        const visit = state.visits[visitId];
        if (!visit) return state;
        return { ...state, visits: { ...state.visits, [visitId]: change(visit) } };
    });
}

export function currentVisit(state: TrackingState): TrackedVisit | null {
    return state.currentId ? (state.visits[state.currentId] ?? null) : null;
}

export function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    void ensureLoaded();
    return () => listeners.delete(listener);
}

export function getSnapshot(): TrackingState {
    return snapshot;
}

/** Whether anything is still waiting to be sent. */
export function hasUnsent(state: TrackingState): boolean {
    return Object.values(state.visits).some((v) => !v.startSent || v.events.length > 0 || v.points.length > 0);
}

/** Drops finished visits that are fully delivered and no longer on screen. */
export function withoutDelivered(state: TrackingState): TrackingState {
    const visits: Record<string, TrackedVisit> = {};
    for (const [id, visit] of Object.entries(state.visits)) {
        const finished = visit.status !== 'active';
        const delivered = visit.startSent && visit.events.length === 0 && visit.points.length === 0;
        if (finished && delivered && id !== state.currentId) continue;
        visits[id] = visit;
    }
    return Object.keys(visits).length === Object.keys(state.visits).length ? state : { ...state, visits };
}
