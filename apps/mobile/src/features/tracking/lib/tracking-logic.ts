import { distanceM, type LngLat } from '@/shared/lib/geo';

/** A GPS fix as the phone reports it. */
export interface RawLocation {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    /** Milliseconds since the epoch. */
    timestamp: number;
}

export interface BufferedPoint {
    at: string;
    position: LngLat;
    accuracyM: number | null;
}

/** A fix less precise than this (a big circle of doubt) says little about where the courier walked. */
export const MAX_ACCURACY_M = 65;

/** A delivery left running this long was forgotten: stop recording instead of draining the battery. */
export const MAX_DELIVERY_AGE_MS = 12 * 60 * 60 * 1000;

export function isInsideZone(position: LngLat, destination: LngLat, radiusM: number): boolean {
    return distanceM(position, destination) <= radiusM;
}

/**
 * Which of the new fixes are worth keeping: precise enough, inside the zone around the destination,
 * and newer than the last one already kept (the phone can deliver the same fix twice).
 */
export function selectRecordable(
    locations: RawLocation[],
    destination: LngLat,
    radiusM: number,
    lastRecordedAt: string | null,
): BufferedPoint[] {
    const lastMs = lastRecordedAt ? Date.parse(lastRecordedAt) : Number.NEGATIVE_INFINITY;
    const kept: BufferedPoint[] = [];
    let previousMs = lastMs;

    for (const location of [...locations].sort((a, b) => a.timestamp - b.timestamp)) {
        if (location.timestamp <= previousMs) continue;
        if (location.accuracy !== null && location.accuracy > MAX_ACCURACY_M) continue;

        const position: LngLat = [location.longitude, location.latitude];
        if (!isInsideZone(position, destination, radiusM)) continue;

        kept.push({ at: new Date(location.timestamp).toISOString(), position, accuracyM: location.accuracy });
        previousMs = location.timestamp;
    }
    return kept;
}

export function takeBatch<T>(items: T[], max: number): T[] {
    return items.slice(0, max);
}

/**
 * The same points always get the same key, so a batch that reached the server but lost its answer
 * is recognised on the retry. (The server also ignores a point it already has.)
 */
export function batchKey(visitId: string, batch: BufferedPoint[]): string {
    return `pts-${visitId}-${batch[0].at}-${batch.length}`;
}

/** Whole seconds from entering the zone to the door, or null when either moment is unknown. */
export function lastMetersSeconds(enteredAt: string | null, doorAt: string | null): number | null {
    if (!enteredAt || !doorAt) return null;
    const seconds = Math.round((Date.parse(doorAt) - Date.parse(enteredAt)) / 1000);
    return seconds >= 0 ? seconds : null;
}

export function isForgotten(startedAt: string, now: Date): boolean {
    return now.getTime() - Date.parse(startedAt) > MAX_DELIVERY_AGE_MS;
}
