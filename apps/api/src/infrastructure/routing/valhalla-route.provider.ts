import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RoutingUnavailableError } from '@domain/routing/domain-error';
import type { RouteProvider, RouteQuery, RouteResult } from '@domain/routing/route-provider';
import type { Env } from '@infrastructure/config';

import { decodePolyline } from './polyline';

const REQUEST_TIMEOUT_MS = 10_000;
/** Valhalla's "No path could be found for input". */
const NO_PATH_ERROR_CODE = 442;

const TripSchema = z.object({
    trip: z.object({
        summary: z.object({ length: z.number(), time: z.number() }),
        legs: z.array(z.object({ shape: z.string() })).min(1),
    }),
});

const ErrorSchema = z.object({ error_code: z.number().optional() });

@Injectable()
export class ValhallaRouteProvider implements RouteProvider {
    constructor(private readonly config: ConfigService<Env, true>) {}

    async route(query: RouteQuery): Promise<RouteResult | null> {
        const baseUrl = this.config.get('VALHALLA_URL', { infer: true });
        if (!baseUrl) throw new RoutingUnavailableError('VALHALLA_URL is not configured');

        const body = {
            locations: [
                { lon: query.from[0], lat: query.from[1] },
                { lon: query.to[0], lat: query.to[1] },
            ],
            costing: 'pedestrian',
            ...(query.avoidZones.length > 0 ? { exclude_polygons: query.avoidZones } : {}),
        };

        let response: Response;
        try {
            response = await fetch(`${baseUrl}/route`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
        } catch {
            throw new RoutingUnavailableError();
        }

        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
            // 400 with code 442 is a normal answer ("no path"), everything else is a router problem.
            if (response.status === 400 && ErrorSchema.safeParse(payload).data?.error_code === NO_PATH_ERROR_CODE) return null;
            throw new RoutingUnavailableError(`Valhalla answered ${response.status}`);
        }

        const parsed = TripSchema.safeParse(payload);
        if (!parsed.success) throw new RoutingUnavailableError('Unexpected response from Valhalla');

        const { summary, legs } = parsed.data.trip;
        return {
            line: decodePolyline(legs[0].shape),
            distanceM: Math.round(summary.length * 1000),
            durationS: Math.round(summary.time),
        };
    }
}
