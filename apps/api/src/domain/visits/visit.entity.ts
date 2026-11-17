import type { LngLat } from '@domain/shared/geo';

export const VisitStatus = {
    Active: 'active',
    Completed: 'completed',
    Cancelled: 'cancelled',
} as const;
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];

export const VisitEventType = {
    ArrivedAtHouse: 'arrived_at_house',
    ReachedDoor: 'reached_door',
    Cancelled: 'cancelled',
} as const;
export type VisitEventType = (typeof VisitEventType)[keyof typeof VisitEventType];

export interface NewVisit {
    id: string;
    tenantId: string;
    courierId: string;
    destination: LngLat;
    label: string | null;
    startedAt: Date;
}

export interface Visit {
    id: string;
    destination: LngLat;
    label: string | null;
    status: VisitStatus;
    startedAt: Date;
    arrivedAt: Date | null;
    doorAt: Date | null;
    finishedAt: Date | null;
    pointCount: number;
}

export interface TrackPoint {
    at: Date;
    position: LngLat;
    accuracyM: number | null;
}
