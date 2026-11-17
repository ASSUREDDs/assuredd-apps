import type { LngLat } from '@domain/shared/geo';

export interface AddressSuggestion {
    id: string;
    label: string;
    street: string | null;
    houseNumber: string | null;
    city: string | null;
    point: LngLat;
}

export interface Geocoder {
    search(query: string, near?: LngLat): Promise<AddressSuggestion[]>;
}

export const GEOCODER = Symbol('Geocoder');
