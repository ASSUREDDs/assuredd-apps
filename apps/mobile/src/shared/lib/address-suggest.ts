import { z } from 'zod';

import { MAPBOX_TOKEN } from '../config/env';
import type { Coordinates } from './geocode';

const FORWARD_GEOCODE_URL = 'https://api.mapbox.com/search/geocode/v6/forward';
const STREET_LIMIT = 5;

const ResponseSchema = z.object({
    features: z.array(
        z.object({
            properties: z.object({
                mapbox_id: z.string(),
                name: z.string(),
                place_formatted: z.string().optional(),
                coordinates: z.object({ latitude: z.number(), longitude: z.number() }),
                context: z.object({ place: z.object({ name: z.string() }).optional() }).optional(),
            }),
        }),
    ),
});

type Feature = z.infer<typeof ResponseSchema>['features'][number];

interface ForwardGeocodeOptions {
    query: string;
    types: 'street' | 'place';
    limit: number;
    proximity?: Coordinates;
    signal?: AbortSignal;
}

async function forwardGeocode({ query, types, limit, proximity, signal }: ForwardGeocodeOptions): Promise<Feature[]> {
    if (!MAPBOX_TOKEN) return [];

    const params = [
        `q=${encodeURIComponent(query)}`,
        'country=ua',
        `types=${types}`,
        'autocomplete=true',
        'language=uk',
        `limit=${limit}`,
        `access_token=${encodeURIComponent(MAPBOX_TOKEN)}`,
    ];

    if (proximity) {
        params.push(`proximity=${proximity.longitude},${proximity.latitude}`);
    }

    const res = await fetch(`${FORWARD_GEOCODE_URL}?${params.join('&')}`, { signal });
    if (!res.ok) {
        throw new Error(`Mapbox geocoding failed with status ${res.status}`);
    }

    const parsed = ResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
        throw new Error('Unexpected response from Mapbox geocoding');
    }

    return parsed.data.features;
}

export interface AddressSuggestion {
    id: string;
    street: string;
    city: string;
    description: string;
    latitude: number;
    longitude: number;
}

export async function suggestUkrainianStreets(
    query: string,
    proximity?: Coordinates,
    signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
    const features = await forwardGeocode({ query, types: 'street', limit: STREET_LIMIT, proximity, signal });

    return features.map(({ properties }) => ({
        id: properties.mapbox_id,
        street: properties.name,
        city: properties.context?.place?.name ?? '',
        description: properties.place_formatted ?? '',
        latitude: properties.coordinates.latitude,
        longitude: properties.coordinates.longitude,
    }));
}

export async function findUkrainianCity(city: string, signal?: AbortSignal): Promise<Coordinates | null> {
    const [first] = await forwardGeocode({ query: city, types: 'place', limit: 1, signal });

    return first ? first.properties.coordinates : null;
}
