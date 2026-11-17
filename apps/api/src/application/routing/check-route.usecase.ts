import { Injectable } from '@nestjs/common';

import type { RouteObstacle } from '@domain/routing/route-obstacle-source';
import { err, ok, type Result } from '@domain/shared/result';

import { type BuildRouteError, type BuildRouteInput, BuildRouteUseCase, type RoutePlan } from './build-route.usecase';

export type RouteChangeReason =
    | { type: 'obstacle_added'; obstacle: RouteObstacle }
    | { type: 'obstacle_removed'; obstacleId: string }
    | { type: 'destination_changed' };

export type RouteCheck = { status: 'unchanged' } | { status: 'changed'; plan: RoutePlan; reasons: RouteChangeReason[] };

export interface CheckRouteInput extends BuildRouteInput {
    known: { version: string; avoidedObstacleIds: string[] };
}

/**
 * The app polls this every 20-30 seconds. Rebuilding is cheap, and comparing versions
 * (destination + avoided obstacles) means a moving courier does not see false changes.
 */
@Injectable()
export class CheckRouteUseCase {
    constructor(private readonly buildRoute: BuildRouteUseCase) {}

    async execute(input: CheckRouteInput): Promise<Result<RouteCheck, BuildRouteError>> {
        const built = await this.buildRoute.execute(input);
        if (!built.ok) return err(built.error);

        const plan = built.value;
        if (plan.version === input.known.version) return ok({ status: 'unchanged' });

        const knownIds = new Set(input.known.avoidedObstacleIds);
        const currentIds = new Set(plan.avoided.map((o) => o.id));

        const reasons: RouteChangeReason[] = [
            ...plan.avoided.filter((o) => !knownIds.has(o.id)).map((obstacle) => ({ type: 'obstacle_added' as const, obstacle })),
            ...[...knownIds].filter((id) => !currentIds.has(id)).map((obstacleId) => ({ type: 'obstacle_removed' as const, obstacleId })),
        ];
        // Same obstacles but a different version means the destination moved (an entrance appeared or went away).
        if (reasons.length === 0) reasons.push({ type: 'destination_changed' });

        return ok({ status: 'changed', plan, reasons });
    }
}
