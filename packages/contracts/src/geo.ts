import { z } from 'zod';

/** [longitude, latitude], the GeoJSON / Mapbox order. */
export const LngLatSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export type LngLat = z.infer<typeof LngLatSchema>;

export const PointSchema = z.object({
    type: z.literal('Point'),
    coordinates: LngLatSchema,
});
export type Point = z.infer<typeof PointSchema>;

export const LineStringSchema = z.object({
    type: z.literal('LineString'),
    coordinates: z.array(LngLatSchema).min(2),
});
export type LineString = z.infer<typeof LineStringSchema>;

/** First ring is the outer boundary, the rest are holes. Rings must be closed. */
export const PolygonSchema = z.object({
    type: z.literal('Polygon'),
    coordinates: z
        .array(z.array(LngLatSchema).min(4))
        .min(1)
        .refine(
            (rings) =>
                rings.every((ring) => {
                    const first = ring[0];
                    const last = ring[ring.length - 1];
                    return first[0] === last[0] && first[1] === last[1];
                }),
            { message: 'Polygon rings must be closed' },
        ),
});
export type Polygon = z.infer<typeof PolygonSchema>;

export const BoundingBoxSchema = z.object({
    west: z.number().min(-180).max(180),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    north: z.number().min(-90).max(90),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;
