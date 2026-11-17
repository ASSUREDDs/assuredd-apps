import {
    CheckRouteResponseSchema,
    RoutePlanSchema,
    type CheckRouteRequest,
    type CheckRouteResponse,
    type RoutePlan,
    type RouteRequest,
} from '@app/contracts';

import { authorizedRequest } from '@/shared/api/authorized-request';

export function buildRoute(input: RouteRequest): Promise<RoutePlan> {
    return authorizedRequest('/routes', RoutePlanSchema, { method: 'POST', body: JSON.stringify(input) });
}

export function checkRoute(input: CheckRouteRequest): Promise<CheckRouteResponse> {
    return authorizedRequest('/routes/check', CheckRouteResponseSchema, { method: 'POST', body: JSON.stringify(input) });
}
