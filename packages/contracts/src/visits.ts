import { z } from 'zod';

import { LngLatSchema } from './geo';

/**
 * A delivery visit: one courier walking to one address. The app records a track only near the address,
 * and marks two moments: arriving in the area around the house, and reaching the door.
 * The time between those two is the number the pilot is measured by.
 */

/** The track is recorded only within this distance of the destination. */
export const TRACK_RADIUS_M = 300;
export const MAX_TRACK_BATCH = 200;

export const VisitStatusSchema = z.enum(['active', 'completed', 'cancelled']);
export type VisitStatus = z.infer<typeof VisitStatusSchema>;

export const StartVisitRequestSchema = z.object({
    /** Created on the phone so that starting a visit can be repeated safely and works offline. */
    id: z.uuid(),
    destination: LngLatSchema,
    /** What the courier typed or picked, for reports. */
    label: z.string().trim().max(160).optional(),
    startedAt: z.iso.datetime(),
});
export type StartVisitRequest = z.infer<typeof StartVisitRequestSchema>;

export const VisitSchema = z.object({
    id: z.uuid(),
    destination: LngLatSchema,
    label: z.string().nullable(),
    status: VisitStatusSchema,
    startedAt: z.string(),
    /** The courier came within the track radius of the address. */
    arrivedAt: z.string().nullable(),
    /** The courier said they are at the door. */
    doorAt: z.string().nullable(),
    finishedAt: z.string().nullable(),
    pointCount: z.number().int(),
});
export type Visit = z.infer<typeof VisitSchema>;

export const VisitEventTypeSchema = z.enum(['arrived_at_house', 'reached_door', 'cancelled']);
export type VisitEventType = z.infer<typeof VisitEventTypeSchema>;

export const VisitEventRequestSchema = z.object({
    type: VisitEventTypeSchema,
    /** When it happened on the phone, which can be earlier than when it is sent. */
    at: z.iso.datetime(),
});
export type VisitEventRequest = z.infer<typeof VisitEventRequestSchema>;

export const TrackPointSchema = z.object({
    at: z.iso.datetime(),
    position: LngLatSchema,
    accuracyM: z.number().min(0).max(10_000).nullable().optional(),
});
export type TrackPoint = z.infer<typeof TrackPointSchema>;

export const TrackBatchRequestSchema = z.object({
    points: z.array(TrackPointSchema).min(1).max(MAX_TRACK_BATCH),
});
export type TrackBatchRequest = z.infer<typeof TrackBatchRequestSchema>;

export const TrackBatchResponseSchema = z.object({
    /** New points stored. A point already stored (a retried batch) is not counted again. */
    accepted: z.number().int(),
    /** Points the server did not keep: timestamps in the future. */
    ignored: z.number().int(),
});
export type TrackBatchResponse = z.infer<typeof TrackBatchResponseSchema>;
