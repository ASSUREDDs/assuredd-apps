import { chooseAddressPoint } from '@/shared/lib/address-point';
import { findUkrainianCity, suggestUkrainianStreets } from '@/shared/lib/address-suggest';
import { geocodeAddress, type Coordinates } from '@/shared/lib/geocode';

interface ResolveInput {
    street: string;
    houseNumber: string;
    city: string;
    /** The point of the street the user picked from the suggestions, if they picked one. */
    pickedStreetPoint?: Coordinates;
}

/** Street-level reference point: the picked suggestion, or the best Mapbox match for what was typed. */
async function findReferencePoint({ street, city, pickedStreetPoint }: ResolveInput): Promise<Coordinates | undefined> {
    if (pickedStreetPoint) return pickedStreetPoint;

    try {
        const cityCenter = await findUkrainianCity(city);
        const [best] = await suggestUkrainianStreets(street, cityCenter ?? undefined);
        return best ? { latitude: best.latitude, longitude: best.longitude } : undefined;
    } catch {
        // No network for the lookup: fall back to the device geocoder alone.
        return undefined;
    }
}

/** The coordinates to save for an address, protected against the device geocoder guessing wrong. */
export async function resolveAddressPoint(input: ResolveInput): Promise<Coordinates | null> {
    const [geocoded, reference] = await Promise.all([
        geocodeAddress(`${input.street} ${input.houseNumber}, ${input.city}`).catch(() => null),
        findReferencePoint(input),
    ]);

    return chooseAddressPoint(geocoded, reference);
}
