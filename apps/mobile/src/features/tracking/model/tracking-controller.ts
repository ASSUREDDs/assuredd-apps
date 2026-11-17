import * as Location from 'expo-location';

import { randomUuid } from '@/shared/lib/uuid';
import type { LngLat } from '@/shared/lib/geo';

import { isTrackingSupported } from '../lib/background-task';
import { areLocationUpdatesRunning, startLocationUpdates, stopLocationUpdates } from '../lib/location-updates';
import { syncTracking } from './track-sync';
import { currentVisit, getState, updateState, updateVisit } from './tracking-state';

export interface StartDeliveryInput {
    userId: string;
    destination: LngLat;
    label: string | null;
}

export type StartDeliveryResult =
    | { ok: true; backgroundGranted: boolean }
    | { ok: false; reason: 'already_active' | 'location_denied' | 'unsupported' | 'failed' };

/**
 * Begins a delivery: asks for location access (including "always", so tracking continues with the screen off),
 * records the visit locally (it is sent as soon as there is a connection) and starts coarse location updates.
 * Without "always" access it still works, but only while the app stays open.
 */
export async function startDelivery(input: StartDeliveryInput): Promise<StartDeliveryResult> {
    if (!isTrackingSupported) return { ok: false, reason: 'unsupported' };

    const state = await getState();
    if (currentVisit(state)?.status === 'active') return { ok: false, reason: 'already_active' };

    try {
        const foreground = await Location.requestForegroundPermissionsAsync();
        if (!foreground.granted) return { ok: false, reason: 'location_denied' };

        const background = await Location.requestBackgroundPermissionsAsync().catch(() => ({ granted: false }));

        const visitId = randomUuid();
        await updateState((current) => ({
            currentId: visitId,
            visits: {
                ...current.visits,
                [visitId]: {
                    visitId,
                    userId: input.userId,
                    destination: input.destination,
                    label: input.label,
                    startedAt: new Date().toISOString(),
                    status: 'active',
                    startSent: false,
                    enteredAt: null,
                    doorAt: null,
                    lastRecordedAt: null,
                    events: [],
                    points: [],
                },
            },
        }));

        await startLocationUpdates('approach');
        void syncTracking();
        return { ok: true, backgroundGranted: background.granted };
    } catch {
        return { ok: false, reason: 'failed' };
    }
}

async function finish(status: 'completed' | 'cancelled'): Promise<void> {
    const visit = currentVisit(await getState());
    if (!visit || visit.status !== 'active') return;

    const at = new Date().toISOString();
    await updateVisit(visit.visitId, (v) => ({
        ...v,
        status,
        doorAt: status === 'completed' ? at : v.doorAt,
        events: [...v.events, { type: status === 'completed' ? 'reached_door' : 'cancelled', at }],
    }));

    await stopLocationUpdates();
    void syncTracking();
}

/** The courier says they are at the door. The time since entering the zone is the number the pilot measures. */
export const markDoorReached = (): Promise<void> => finish('completed');

export const cancelDelivery = (): Promise<void> => finish('cancelled');

/** Removes the finished visit from the screen. Anything not yet sent keeps waiting in the background. */
export async function dismissDelivery(): Promise<void> {
    await updateState((state) => (state.currentId ? { ...state, currentId: null } : state));
    void syncTracking();
}

/** After the app was closed or crashed during a delivery: start the location updates again. */
export async function resumeTracking(): Promise<void> {
    if (!isTrackingSupported) return;

    const visit = currentVisit(await getState());
    if (!visit || visit.status !== 'active') return;

    try {
        if (!(await areLocationUpdatesRunning())) await startLocationUpdates(visit.enteredAt ? 'near' : 'approach');
    } catch {
        // Permission was withdrawn: the courier sees that nothing is being recorded and can restart.
    }
}
