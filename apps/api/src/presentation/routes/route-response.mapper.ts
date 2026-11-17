import type { AvoidedObstacle, CheckRouteResponse, RoutePlan as RoutePlanResponse } from '@app/contracts';

import type { RouteObstacle } from '@domain/routing/route-obstacle-source';
import type { RoutePlan } from '@application/routing/build-route.usecase';
import type { RouteCheck } from '@application/routing/check-route.usecase';

function toAvoided(obstacle: RouteObstacle): AvoidedObstacle {
    return { id: obstacle.id, kind: obstacle.kind, comment: obstacle.comment, center: obstacle.center };
}

export function toRoutePlanResponse(plan: RoutePlan): RoutePlanResponse {
    return {
        geometry: { type: 'LineString', coordinates: plan.line },
        distanceM: plan.distanceM,
        durationS: plan.durationS,
        destination: plan.destination,
        avoided: plan.avoided.map(toAvoided),
        warnings: plan.warnings.map(toAvoided),
        version: plan.version,
    };
}

export function toCheckRouteResponse(check: RouteCheck): CheckRouteResponse {
    if (check.status === 'unchanged') return { status: 'unchanged' };

    return {
        status: 'changed',
        plan: toRoutePlanResponse(check.plan),
        reasons: check.reasons.map((reason) =>
            reason.type === 'obstacle_added' ? { type: reason.type, obstacle: toAvoided(reason.obstacle) } : reason,
        ),
    };
}
