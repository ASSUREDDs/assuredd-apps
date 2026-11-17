export type LngLat = [number, number];

export interface Bounds {
    west: number;
    south: number;
    east: number;
    north: number;
}

const EARTH_RADIUS_M = 6_371_000;

/** A ring approximating a circle, for drawing previews. Closed (first point repeated at the end). */
export function circleRing(center: LngLat, radiusM: number, steps = 48): LngLat[] {
    const [lng, lat] = center;
    const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
    const dLng = dLat / Math.cos((lat * Math.PI) / 180);

    const ring: LngLat[] = [];
    for (let i = 0; i < steps; i++) {
        const angle = (2 * Math.PI * i) / steps;
        ring.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
    }
    ring.push(ring[0]);
    return ring;
}

export function isInside(point: LngLat, bounds: Bounds): boolean {
    return point[0] >= bounds.west && point[0] <= bounds.east && point[1] >= bounds.south && point[1] <= bounds.north;
}

/** Great-circle distance in meters. */
export function distanceM(a: LngLat, b: LngLat): number {
    const rad = Math.PI / 180;
    const dLat = (b[1] - a[1]) * rad;
    const dLng = (b[0] - a[0]) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
