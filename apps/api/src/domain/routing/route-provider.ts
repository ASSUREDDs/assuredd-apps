import type { LngLat } from '@domain/shared/geo';

export interface RouteQuery {
    from: LngLat;
    to: LngLat;
    /** Outer rings of zones the route must not enter. */
    avoidZones: LngLat[][];
}

export interface RouteResult {
    line: LngLat[];
    distanceM: number;
    durationS: number;
}

/**
 * Any walking router (Valhalla today, our own algorithm later) sits behind this.
 * Returns null when no path exists; throws RoutingUnavailableError when the router itself fails.
 */
export interface RouteProvider {
    route(query: RouteQuery): Promise<RouteResult | null>;
}

export const ROUTE_PROVIDER = Symbol('RouteProvider');
