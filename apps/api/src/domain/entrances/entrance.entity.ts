import type { LngLat } from '@domain/shared/geo';

export interface NewEntrance {
    id: string;
    tenantId: string;
    createdBy: string;
    house: LngLat;
    entrance: LngLat;
    label: string | null;
    comment: string | null;
    createdAt: Date;
}

export interface Entrance {
    id: string;
    house: LngLat;
    entrance: LngLat;
    label: string | null;
    comment: string | null;
    createdBy: string;
    createdAt: Date;
}
