import { z } from 'zod';

import { BoundingBoxSchema, LngLatSchema, PolygonSchema } from './geo';

/**
 * Things the route must avoid. An alternate entrance is NOT an obstacle:
 * it changes the destination point instead (see `entrances.ts`).
 */
export const ObstacleKindSchema = z.enum(['closed_arch', 'incident']);
export type ObstacleKind = z.infer<typeof ObstacleKindSchema>;

export const ObstacleStatusSchema = z.enum(['active', 'removed', 'expired']);
export type ObstacleStatus = z.infer<typeof ObstacleStatusSchema>;

export const ObstacleVoteSchema = z.enum(['still_relevant', 'no_longer_relevant']);
export type ObstacleVote = z.infer<typeof ObstacleVoteSchema>;

export const MAX_OBSTACLE_RADIUS_M = 200;
export const MAX_OBSTACLE_POLYGON_POINTS = 64;
export const MAX_OBSTACLE_AREA_M2 = 150_000;

/** The affected place: a circle around a point, or a small polygon. */
export const ObstacleShapeSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('circle'),
        center: LngLatSchema,
        radiusM: z.number().int().min(1).max(MAX_OBSTACLE_RADIUS_M),
    }),
    z.object({
        type: z.literal('polygon'),
        polygon: PolygonSchema.refine((p) => p.coordinates[0].length <= MAX_OBSTACLE_POLYGON_POINTS, {
            message: `Polygon has too many points (max ${MAX_OBSTACLE_POLYGON_POINTS})`,
        }),
    }),
]);
export type ObstacleShape = z.infer<typeof ObstacleShapeSchema>;

export const CreateObstacleRequestSchema = z.object({
    kind: ObstacleKindSchema,
    shape: ObstacleShapeSchema,
    comment: z.string().trim().max(500).optional(),
});
export type CreateObstacleRequest = z.infer<typeof CreateObstacleRequestSchema>;

export const ObstacleSchema = z.object({
    id: z.uuid(),
    kind: ObstacleKindSchema,
    status: ObstacleStatusSchema,
    /** Circle center, or a point inside the polygon. Where to draw the icon. */
    center: LngLatSchema,
    /** Set for circles, null for polygons. */
    radiusM: z.number().nullable(),
    /** Always a polygon, so routing can use it directly as an avoid zone. */
    geometry: PolygonSchema,
    comment: z.string().nullable(),
    createdBy: z.uuid(),
    createdAt: z.string(),
    /** Null means it lives until removed. */
    expiresAt: z.string().nullable(),
    confirmations: z.object({
        stillRelevant: z.number().int(),
        noLongerRelevant: z.number().int(),
    }),
    /** The calling courier's own mark, if any. */
    myVote: ObstacleVoteSchema.nullable(),
});
export type Obstacle = z.infer<typeof ObstacleSchema>;

export const ObstacleListResponseSchema = z.object({ items: z.array(ObstacleSchema) });
export type ObstacleListResponse = z.infer<typeof ObstacleListResponseSchema>;

export const VoteObstacleRequestSchema = z.object({ vote: ObstacleVoteSchema });
export type VoteObstacleRequest = z.infer<typeof VoteObstacleRequestSchema>;

export const MAX_SEARCH_RADIUS_M = 5000;
export const MAX_BBOX_SPAN_DEG = 0.5;

const numberFromQuery = z.coerce.number();

/** `bbox=west,south,east,north` OR `lng`+`lat`+`radiusM`; optional `kind=closed_arch,incident`. */
export const SearchObstaclesQuerySchema = z
    .object({
        bbox: z
            .string()
            .optional()
            .transform((value, ctx) => {
                if (value === undefined) return undefined;
                const parts = value.split(',').map(Number);
                const parsed = BoundingBoxSchema.safeParse({
                    west: parts[0],
                    south: parts[1],
                    east: parts[2],
                    north: parts[3],
                });
                if (parts.length !== 4 || !parsed.success) {
                    ctx.addIssue({ code: 'custom', message: 'bbox must be west,south,east,north' });
                    return z.NEVER;
                }
                const { west, south, east, north } = parsed.data;
                if (west >= east || south >= north || east - west > MAX_BBOX_SPAN_DEG || north - south > MAX_BBOX_SPAN_DEG) {
                    ctx.addIssue({ code: 'custom', message: `bbox is empty or larger than ${MAX_BBOX_SPAN_DEG} degrees` });
                    return z.NEVER;
                }
                return parsed.data;
            }),
        lng: numberFromQuery.min(-180).max(180).optional(),
        lat: numberFromQuery.min(-90).max(90).optional(),
        radiusM: numberFromQuery.int().min(1).max(MAX_SEARCH_RADIUS_M).optional(),
        kind: z
            .string()
            .optional()
            .transform((value, ctx) => {
                if (value === undefined) return undefined;
                const parsed = z.array(ObstacleKindSchema).safeParse(value.split(','));
                if (!parsed.success) {
                    ctx.addIssue({ code: 'custom', message: 'kind must be a comma separated list of obstacle kinds' });
                    return z.NEVER;
                }
                return parsed.data;
            }),
    })
    .refine(
        (q) => {
            const hasBbox = q.bbox !== undefined;
            const hasRadius = q.lng !== undefined && q.lat !== undefined && q.radiusM !== undefined;
            const partialRadius = [q.lng, q.lat, q.radiusM].some((v) => v !== undefined) && !hasRadius;
            return !partialRadius && hasBbox !== hasRadius;
        },
        { message: 'Provide either bbox, or lng + lat + radiusM' },
    );
export type SearchObstaclesQuery = z.infer<typeof SearchObstaclesQuerySchema>;
