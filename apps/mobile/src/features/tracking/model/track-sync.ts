import { MAX_TRACK_BATCH } from '@app/contracts';

import { ApiError, isTransientError } from '@/shared/api/errors';

import { sendTrackPoints, sendVisitEvent, startVisit } from '../api/visit.api';
import { batchKey, takeBatch } from '../lib/tracking-logic';
import { getState, updateState, updateVisit, withoutDelivered } from './tracking-state';

let current: Promise<void> | null = null;
let runAgain = false;

/** True when the error means "not now": no connection, server trouble, or the session needs a refresh. */
function shouldRetryLater(error: unknown): boolean {
    return isTransientError(error) || (error instanceof ApiError && error.status === 401);
}

/**
 * Sends everything the server has not received: starting the visit, the events, then the points in batches.
 * Order matters (events and points need the visit to exist). Stops at the first "not now" and tries again later;
 * something the server refuses for good is dropped so it cannot block the rest.
 *
 * Safe to call from anywhere at any time. A call made while a pass is running asks for one more pass (to pick up
 * what was added meanwhile) and waits for it, so the caller, like a short-lived background task, knows when it is done.
 */
export function syncTracking(): Promise<void> {
    if (current) {
        runAgain = true;
        return current;
    }

    current = (async () => {
        try {
            do {
                runAgain = false;
                const completed = await syncOnce();
                if (!completed) return;
            } while (runAgain);
        } finally {
            current = null;
        }
    })();
    return current;
}

/** Returns false when it stopped early and the rest has to wait. */
async function syncOnce(): Promise<boolean> {
    const state = await getState();

    for (const visitId of Object.keys(state.visits)) {
        if (!(await syncVisit(visitId))) return false;
    }

    await updateState(withoutDelivered);
    return true;
}

async function syncVisit(visitId: string): Promise<boolean> {
    const first = (await getState()).visits[visitId];
    if (!first) return true;

    if (!first.startSent) {
        try {
            await startVisit(
                {
                    id: first.visitId,
                    destination: first.destination,
                    label: first.label ?? undefined,
                    startedAt: first.startedAt,
                },
                `visit-${first.visitId}`,
            );
            await updateVisit(visitId, (visit) => ({ ...visit, startSent: true }));
        } catch (error) {
            if (shouldRetryLater(error)) return false;
            // The server will never accept this visit: forget it and everything that hangs on it.
            await updateState((state) => {
                const rest = Object.fromEntries(Object.entries(state.visits).filter(([id]) => id !== visitId));
                return { ...state, visits: rest, currentId: state.currentId === visitId ? null : state.currentId };
            });
            return true;
        }
    }

    for (;;) {
        const visit = (await getState()).visits[visitId];
        const event = visit?.events[0];
        if (!visit || !event) break;

        try {
            await sendVisitEvent(visitId, event);
        } catch (error) {
            if (shouldRetryLater(error)) return false;
        }
        await updateVisit(visitId, (v) => ({ ...v, events: v.events.slice(1) }));
    }

    for (;;) {
        const visit = (await getState()).visits[visitId];
        if (!visit || visit.points.length === 0) break;

        const batch = takeBatch(visit.points, MAX_TRACK_BATCH);
        try {
            await sendTrackPoints(visitId, { points: batch }, batchKey(visitId, batch));
        } catch (error) {
            if (shouldRetryLater(error)) return false;
        }
        // Points are only ever appended while this runs, so what was sent is exactly the first `batch.length`.
        await updateVisit(visitId, (v) => ({ ...v, points: v.points.slice(batch.length) }));
    }

    return true;
}
