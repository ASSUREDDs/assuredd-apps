import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { resumeTracking } from './tracking-controller';
import { syncTracking } from './track-sync';
import { currentVisit, getSnapshot, hasUnsent, subscribe, type TrackedVisit } from './tracking-state';

/** While something waits to be sent, try this often. The background task also tries on every new fix. */
const RETRY_INTERVAL_MS = 20_000;

/** The delivery shown on screen, and how much of it the server still has to receive. */
export function useCurrentDelivery(): { visit: TrackedVisit | null; unsentPoints: number } {
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return useMemo(() => {
        const visit = currentVisit(state);
        const unsentPoints = Object.values(state.visits).reduce((sum, v) => sum + v.points.length, 0);
        return { visit, unsentPoints };
    }, [state]);
}

/**
 * Keeps tracking alive for a logged-in courier: resumes it after the app was closed mid-delivery,
 * and keeps sending what has been collected. Mount once.
 */
export function useTrackingSync(enabled: boolean): void {
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const waiting = hasUnsent(state);

    useEffect(() => {
        if (!enabled) return;
        void resumeTracking();
        void syncTracking();
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;

        const subscription = AppState.addEventListener('change', (next) => {
            if (next !== 'active') return;
            void resumeTracking();
            void syncTracking();
        });
        return () => subscription.remove();
    }, [enabled]);

    useEffect(() => {
        if (!enabled || !waiting) return;

        const interval = setInterval(() => void syncTracking(), RETRY_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [enabled, waiting]);
}
