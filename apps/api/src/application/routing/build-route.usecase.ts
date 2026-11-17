import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';

import { RouteBlockedError, RouteNotFoundError, RouteTooLongError, RoutingUnavailableError } from '@domain/routing/domain-error';
import { ENTRANCE_FINDER, type EntranceFinder } from '@domain/routing/entrance-finder';
import { ROUTE_OBSTACLE_SOURCE, type RouteObstacle, type RouteObstacleSource } from '@domain/routing/route-obstacle-source';
import { ROUTE_PROVIDER, type RouteProvider, type RouteResult } from '@domain/routing/route-provider';
import { distanceM, type LngLat } from '@domain/shared/geo';
import { err, ok, type Result } from '@domain/shared/result';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';

/** Routes that start or end near a house snap to its known entrance within this distance. */
const ENTRANCE_SNAP_RADIUS_M = 30;
const MAX_DISTANCE_M = 15_000;
/** Each pass adds the obstacles a detour runs into; a few passes are enough for a courtyard. */
const MAX_PASSES = 4;

export interface BuildRouteInput {
    tenantId: string;
    from: LngLat;
    to: LngLat;
    useEntrance: boolean;
}

export interface RoutePlan extends RouteResult {
    destination: { point: LngLat; source: 'address' | 'entrance'; entranceId: string | null };
    avoided: RouteObstacle[];
    warnings: RouteObstacle[];
    version: string;
}

export type BuildRouteError = RouteNotFoundError | RouteBlockedError | RouteTooLongError | RoutingUnavailableError;

export function routeVersion(destination: LngLat, avoidedIds: string[]): string {
    return createHash('sha256')
        .update(`${destination[0]},${destination[1]}|${[...avoidedIds].sort().join(',')}`)
        .digest('hex')
        .slice(0, 16);
}

@Injectable()
export class BuildRouteUseCase {
    constructor(
        @Inject(ROUTE_PROVIDER) private readonly provider: RouteProvider,
        @Inject(ROUTE_OBSTACLE_SOURCE) private readonly obstacles: RouteObstacleSource,
        @Inject(ENTRANCE_FINDER) private readonly entrances: EntranceFinder,
        @Inject(CLOCK) private readonly clock: Clock,
    ) {}

    async execute(input: BuildRouteInput): Promise<Result<RoutePlan, BuildRouteError>> {
        if (distanceM(input.from, input.to) > MAX_DISTANCE_M) return err(new RouteTooLongError());

        const now = this.clock.now();
        const destination = await this.resolveDestination(input);

        // Obstacles that cover the start or the door are reported, not avoided: the courier must get there.
        const warnings = await this.obstacles.findAtPoints(input.tenantId, [input.from, destination.point], now);
        const avoided = new Map<string, RouteObstacle>();
        const exempt = new Set(warnings.map((o) => o.id));

        try {
            for (let pass = 0; pass < MAX_PASSES; pass++) {
                const result = await this.provider.route({
                    from: input.from,
                    to: destination.point,
                    avoidZones: [...avoided.values()].map((o) => o.ring),
                });
                if (!result) {
                    return err(avoided.size === 0 ? new RouteNotFoundError() : new RouteBlockedError([...avoided.keys()]));
                }

                const hits = await this.obstacles.findCrossingLine(input.tenantId, result.line, now, [
                    ...exempt,
                    ...avoided.keys(),
                ]);
                if (hits.length === 0) {
                    const avoidedList = [...avoided.values()];
                    return ok({
                        ...result,
                        destination,
                        avoided: avoidedList,
                        warnings,
                        version: routeVersion(
                            destination.point,
                            avoidedList.map((o) => o.id),
                        ),
                    });
                }
                for (const hit of hits) avoided.set(hit.id, hit);
            }
        } catch (error) {
            if (error instanceof RoutingUnavailableError) return err(error);
            throw error;
        }

        // Every detour keeps running into new obstacles: treat the area as blocked.
        return err(new RouteBlockedError([...avoided.keys()]));
    }

    private async resolveDestination(input: BuildRouteInput): Promise<RoutePlan['destination']> {
        if (input.useEntrance) {
            const nearest = await this.entrances.findNearest(input.tenantId, input.to, ENTRANCE_SNAP_RADIUS_M);
            if (nearest) return { point: nearest.point, source: 'entrance', entranceId: nearest.id };
        }
        return { point: input.to, source: 'address', entranceId: null };
    }
}
