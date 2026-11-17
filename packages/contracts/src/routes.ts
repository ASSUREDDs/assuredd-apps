import { z } from 'zod';

import { LineStringSchema, LngLatSchema } from './geo';
import { ObstacleKindSchema } from './obstacles';

/** Stage 2 works on the last few hundred meters; anything much longer is a mistake. */
export const MAX_ROUTE_DISTANCE_M = 15_000;

export const RouteRequestSchema = z.object({
    /** The courier's current position. */
    from: LngLatSchema,
    /** The delivery address point. */
    to: LngLatSchema,
    /** Lead to a known entrance of the house instead of the address point (default true). */
    useEntrance: z.boolean().default(true),
});
export type RouteRequest = z.infer<typeof RouteRequestSchema>;

export const RouteDestinationSchema = z.object({
    point: LngLatSchema,
    source: z.enum(['address', 'entrance']),
    entranceId: z.uuid().nullable(),
});

export const AvoidedObstacleSchema = z.object({
    id: z.uuid(),
    kind: ObstacleKindSchema,
    comment: z.string().nullable(),
    center: LngLatSchema,
});
export type AvoidedObstacle = z.infer<typeof AvoidedObstacleSchema>;

export const RoutePlanSchema = z.object({
    geometry: LineStringSchema,
    distanceM: z.number(),
    durationS: z.number(),
    destination: RouteDestinationSchema,
    /** Obstacles the route goes around. */
    avoided: z.array(AvoidedObstacleSchema),
    /**
     * Obstacles that cover the start or the destination itself. They are not avoided
     * (the courier has to get to the door) but the app should warn about them.
     */
    warnings: z.array(AvoidedObstacleSchema),
    /** Changes when the destination or the set of avoided obstacles changes. Send it back to `/routes/check`. */
    version: z.string(),
});
export type RoutePlan = z.infer<typeof RoutePlanSchema>;

export const CheckRouteRequestSchema = RouteRequestSchema.extend({
    known: z.object({
        version: z.string(),
        avoidedObstacleIds: z.array(z.uuid()).max(100),
    }),
});
export type CheckRouteRequest = z.infer<typeof CheckRouteRequestSchema>;

export const RouteChangeReasonSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('obstacle_added'), obstacle: AvoidedObstacleSchema }),
    z.object({ type: z.literal('obstacle_removed'), obstacleId: z.uuid() }),
    z.object({ type: z.literal('destination_changed') }),
]);
export type RouteChangeReason = z.infer<typeof RouteChangeReasonSchema>;

export const CheckRouteResponseSchema = z.discriminatedUnion('status', [
    z.object({ status: z.literal('unchanged') }),
    z.object({ status: z.literal('changed'), plan: RoutePlanSchema, reasons: z.array(RouteChangeReasonSchema) }),
]);
export type CheckRouteResponse = z.infer<typeof CheckRouteResponseSchema>;

/** Error `code` values the routes endpoints can return. */
export const RouteErrorCode = {
    /** 404: no walking path between the points (or they are outside the loaded map area). */
    NotFound: 'ROUTE_NOT_FOUND',
    /** 422: a path exists, but only through active obstacles. `obstacleIds` lists them. */
    Blocked: 'ROUTE_BLOCKED',
    /** 422: start and destination are too far apart. */
    TooLong: 'ROUTE_TOO_LONG',
    /** 503: the routing service is down. */
    Unavailable: 'ROUTING_UNAVAILABLE',
} as const;
