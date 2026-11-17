import type * as Location from 'expo-location';

import { processLocations } from '../model/tracking-processor';
import { TRACKING_TASK } from './location-updates';

interface LocationTaskData {
    locations: Location.LocationObject[];
}

// The task manager is a native module. A build made before it was added does not have it, and importing it
// there would crash the whole app at start-up, so load it defensively: without it only tracking is unavailable.
function loadTaskManager(): typeof import('expo-task-manager') | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('expo-task-manager') as typeof import('expo-task-manager');
    } catch {
        return null;
    }
}

const TaskManager = loadTaskManager();

/** False in a build that was made without the task manager (tracking needs a rebuild of the app). */
export const isTrackingSupported = TaskManager !== null;

/**
 * Registered at module load, outside any component, so the system can run it even when the app was relaunched
 * in the background just to deliver a location (the screen never mounts then). Import this file from the root layout.
 */
TaskManager?.defineTask<LocationTaskData>(TRACKING_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;

    await processLocations(
        data.locations.map((location) => ({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
        })),
    );
});
