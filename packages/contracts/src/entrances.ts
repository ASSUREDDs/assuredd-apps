import { z } from 'zod';

import { LngLatSchema } from './geo';

export const MAX_ENTRANCE_SEARCH_RADIUS_M = 200;
export const DEFAULT_ENTRANCE_SEARCH_RADIUS_M = 30;

/**
 * Permanent knowledge about a house: the usual way in is on the other side.
 * Does not affect avoid zones, it only changes the route's destination point.
 */
export const CreateEntranceRequestSchema = z.object({
    /** A point on the house, where couriers search from (the delivery address point). */
    house: LngLatSchema,
    /** The door the route should lead to. */
    entrance: LngLatSchema,
    label: z.string().trim().max(120).optional(),
    comment: z.string().trim().max(500).optional(),
});
export type CreateEntranceRequest = z.infer<typeof CreateEntranceRequestSchema>;

export const EntranceSchema = z.object({
    id: z.uuid(),
    house: LngLatSchema,
    entrance: LngLatSchema,
    label: z.string().nullable(),
    comment: z.string().nullable(),
    createdBy: z.uuid(),
    createdAt: z.string(),
});
export type Entrance = z.infer<typeof EntranceSchema>;

export const EntranceListResponseSchema = z.object({ items: z.array(EntranceSchema) });
export type EntranceListResponse = z.infer<typeof EntranceListResponseSchema>;

/** Entrances whose house point is within `radiusM` of the given point. */
export const SearchEntrancesQuerySchema = z.object({
    lng: z.coerce.number().min(-180).max(180),
    lat: z.coerce.number().min(-90).max(90),
    radiusM: z.coerce.number().int().min(1).max(MAX_ENTRANCE_SEARCH_RADIUS_M).default(DEFAULT_ENTRANCE_SEARCH_RADIUS_M),
});
export type SearchEntrancesQuery = z.infer<typeof SearchEntrancesQuerySchema>;
