import { TRACK_RADIUS_M } from '@app/contracts';

import { isForgotten, type RawLocation, selectRecordable } from '../lib/tracking-logic';
import { startLocationUpdates, stopLocationUpdates } from '../lib/location-updates';
import { syncTracking } from './track-sync';
import { currentVisit, getState, updateVisit } from './tracking-state';

/** A background run is short; do not let a slow network eat all of it. */
const SYNC_BUDGET_MS = 10_000;

/**
 * Handles a batch of fixes from the phone: keeps those near the address, notices the moment the courier
 * enters the zone (and switches to precise tracking), and tries to send what was collected.
 * Runs in the background task, so it must not depend on anything on screen.
 */
export async function processLocations(locations: RawLocation[], now: Date = new Date()): Promise<void> {
    const state = await getState();
    const visit = currentVisit(state);

    if (!visit || visit.status !== 'active') {
        await stopLocationUpdates();
        return;
    }

    if (isForgotten(visit.startedAt, now)) {
        // Left running by mistake: end it rather than record for days.
        await updateVisit(visit.visitId, (v) => ({
            ...v,
            status: 'cancelled',
            events: [...v.events, { type: 'cancelled', at: now.toISOString() }],
        }));
        await stopLocationUpdates();
        await syncTracking();
        return;
    }

    const recordable = selectRecordable(locations, visit.destination, TRACK_RADIUS_M, visit.lastRecordedAt);
    if (recordable.length === 0) return;

    const firstEntry = visit.enteredAt === null;
    await updateVisit(visit.visitId, (v) => ({
        ...v,
        points: [...v.points, ...recordable],
        lastRecordedAt: recordable[recordable.length - 1].at,
        enteredAt: v.enteredAt ?? recordable[0].at,
        events: v.enteredAt ? v.events : [...v.events, { type: 'arrived_at_house', at: recordable[0].at }],
    }));

    if (firstEntry) {
        try {
            await startLocationUpdates('near');
        } catch {
            // Keep the coarse updates running rather than lose tracking.
        }
    }

    await Promise.race([syncTracking(), new Promise<void>((resolve) => setTimeout(resolve, SYNC_BUDGET_MS))]);
}
