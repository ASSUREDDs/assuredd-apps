/**
 * Every write that changes obstacles (add, confirm, remove) carries this key. The route logic listens
 * for it to re-check the route at once, without the two features importing each other.
 */
export const OBSTACLE_WRITE_KEY = ['obstacle-write'] as const;
