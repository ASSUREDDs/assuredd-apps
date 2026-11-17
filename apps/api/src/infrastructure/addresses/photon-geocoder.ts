import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RoutingUnavailableError } from '@domain/routing/domain-error';
import type { LngLat } from '@domain/shared/geo';
import type { AddressSuggestion, Geocoder } from '@application/addresses/ports/geocoder.port';
import type { Env } from '@infrastructure/config';

const REQUEST_TIMEOUT_MS = 5_000;
const LIMIT = 5;
/** west,south,east,north: keeps results inside Ukraine. */
const UKRAINE_BBOX = '21.9,44.2,40.3,52.4';

const ResponseSchema = z.object({
    features: z.array(
        z.object({
            geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
            properties: z.object({
                osm_type: z.string().optional(),
                osm_id: z.number().optional(),
                name: z.string().optional(),
                street: z.string().optional(),
                housenumber: z.string().optional(),
                city: z.string().optional(),
                district: z.string().optional(),
            }),
        }),
    ),
});

/**
 * Photon (geocoder over OpenStreetMap). The default public server is for development only;
 * point GEOCODER_URL at a self-hosted Photon or swap this class for another Geocoder in production.
 */
@Injectable()
export class PhotonGeocoder implements Geocoder {
    private readonly logger = new Logger(PhotonGeocoder.name);

    constructor(private readonly config: ConfigService<Env, true>) {}

    async search(query: string, near?: LngLat): Promise<AddressSuggestion[]> {
        const url = new URL('/api/', this.config.get('GEOCODER_URL', { infer: true }));
        url.searchParams.set('q', query);
        url.searchParams.set('limit', String(LIMIT));
        url.searchParams.set('bbox', UKRAINE_BBOX);
        if (near) {
            url.searchParams.set('lon', String(near[0]));
            url.searchParams.set('lat', String(near[1]));
        }

        let response: Response;
        try {
            response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        } catch (error) {
            this.logger.warn(`Geocoder request failed: ${error instanceof Error ? error.message : String(error)}`);
            throw new RoutingUnavailableError('Address search is unavailable');
        }
        if (!response.ok) throw new RoutingUnavailableError('Address search is unavailable');

        const parsed = ResponseSchema.safeParse(await response.json().catch(() => null));
        if (!parsed.success) throw new RoutingUnavailableError('Address search is unavailable');

        return parsed.data.features.map(({ geometry, properties: p }, index) => {
            const streetLine = [p.street ?? p.name, p.housenumber].filter(Boolean).join(' ');
            const label = [streetLine, p.city ?? p.district].filter(Boolean).join(', ');
            return {
                id: p.osm_type && p.osm_id ? `${p.osm_type}${p.osm_id}` : `${index}`,
                label: label || (p.name ?? query),
                street: p.street ?? p.name ?? null,
                houseNumber: p.housenumber ?? null,
                city: p.city ?? null,
                point: geometry.coordinates,
            };
        });
    }
}
