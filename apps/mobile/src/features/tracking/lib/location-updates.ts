import * as Location from 'expo-location';

export const TRACKING_TASK = 'assuredd-courier-tracking';

export type TrackingPhase = 'approach' | 'near';

const NOTIFICATION = {
    notificationTitle: 'Delivery in progress',
    notificationBody: 'Assuredd records your route near the delivery address.',
};

/**
 * `approach`: the courier is still far, so a coarse fix every ~50 m is enough to notice arriving (cheap on battery).
 * `near`: inside the zone, so a precise fix every few meters, which is what makes the track useful.
 */
function optionsFor(phase: TrackingPhase): Location.LocationTaskOptions {
    return {
        accuracy: phase === 'near' ? Location.Accuracy.High : Location.Accuracy.Balanced,
        distanceInterval: phase === 'near' ? 5 : 50,
        timeInterval: phase === 'near' ? 3_000 : 15_000,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: NOTIFICATION,
    };
}

/** Starts (or restarts with other settings) the location updates that feed the background task. */
export async function startLocationUpdates(phase: TrackingPhase): Promise<void> {
    if (await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK)) {
        await Location.stopLocationUpdatesAsync(TRACKING_TASK);
    }
    await Location.startLocationUpdatesAsync(TRACKING_TASK, optionsFor(phase));
}

export async function stopLocationUpdates(): Promise<void> {
    try {
        if (await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK)) {
            await Location.stopLocationUpdatesAsync(TRACKING_TASK);
        }
    } catch {
        // Already stopped, or the task is not registered in this runtime.
    }
}

export async function areLocationUpdatesRunning(): Promise<boolean> {
    try {
        return await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK);
    } catch {
        return false;
    }
}
