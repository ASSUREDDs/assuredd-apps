export type LngLat = [number, number];

export const UKRAINE_CENTER: LngLat = [31.1656, 48.3794];

export const UKRAINE_BOUNDS: { ne: LngLat; sw: LngLat } = {
    ne: [40.3, 52.4],
    sw: [21.9, 44.2],
};

export const UKRAINE_ZOOM = 4.8;
export const UKRAINE_MIN_ZOOM = 4.5;
export const UKRAINE_MAX_ZOOM = 18;

export const CITY_ZOOM = 11;

export const ZOOM_STEP = 1;
