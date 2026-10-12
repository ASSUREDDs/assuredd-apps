export type LngLat = [number, number];

/** Geographic center of Ukraine, [longitude, latitude]. */
export const UKRAINE_CENTER: LngLat = [31.1656, 48.3794];

/** Box around Ukraine, used to keep the camera over the country. */
export const UKRAINE_BOUNDS: { ne: LngLat; sw: LngLat } = {
    ne: [40.3, 52.4],
    sw: [21.9, 44.2],
};

/** Zoom level at which the whole country fits on a phone screen. */
export const UKRAINE_ZOOM = 4.8;
export const UKRAINE_MIN_ZOOM = 4.5;
export const UKRAINE_MAX_ZOOM = 18;

/** Zoom level that frames a city rather than the whole country. */
export const CITY_ZOOM = 11;

/** How much a single tap on the zoom controls changes the zoom level. */
export const ZOOM_STEP = 1;
