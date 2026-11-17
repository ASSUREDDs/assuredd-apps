import type { Coordinates } from './geocode';
import { distanceM } from './geo';

/**
 * How far the device geocoder may land from the street found by Mapbox before it is not trusted.
 * A house is normally within a kilometer or two of its street's reference point; a wrong guess
 * (a misspelled street matched to another one) lands many kilometers away.
 */
export const MAX_DRIFT_M = 5_000;

/**
 * Picks the point to store for an address. The device geocoder knows the house number and is precise,
 * but it guesses blindly on typos; the street found by Mapbox is only street-level but reliable.
 * Use the precise point unless it disagrees with the reference by more than `maxDriftM`.
 */
export function chooseAddressPoint(
    geocoded: Coordinates | null,
    reference: Coordinates | null | undefined,
    maxDriftM: number = MAX_DRIFT_M,
): Coordinates | null {
    if (!geocoded) return reference ?? null;
    if (!reference) return geocoded;

    const drift = distanceM([geocoded.longitude, geocoded.latitude], [reference.longitude, reference.latitude]);
    return drift <= maxDriftM ? geocoded : reference;
}
