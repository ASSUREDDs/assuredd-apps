/** [longitude, latitude], the GeoJSON order. */
export type LngLat = [number, number];

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters. */
export function distanceM(a: LngLat, b: LngLat): number {
    const rad = Math.PI / 180;
    const dLat = (b[1] - a[1]) * rad;
    const dLng = (b[0] - a[0]) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
