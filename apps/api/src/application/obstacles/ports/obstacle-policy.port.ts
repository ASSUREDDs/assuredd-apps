export interface ObstaclePolicy {
    /** How long an incident lives without a "still relevant" mark. */
    incidentTtlMs: number;
    /** This many "no longer relevant" marks from different couriers remove an obstacle. */
    dismissThreshold: number;
    /** Largest allowed obstacle area, in square meters. */
    maxAreaM2: number;
}

export const OBSTACLE_POLICY = Symbol('ObstaclePolicy');
