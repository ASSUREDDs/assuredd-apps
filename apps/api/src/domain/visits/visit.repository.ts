import type { NewVisit, TrackPoint, Visit, VisitEventType } from './visit.entity';

export interface VisitRepository {
    /**
     * `created`: stored now. `exists`: this courier already started it (a repeat, so the answer is the same).
     * `taken`: the id belongs to someone else.
     */
    create(visit: NewVisit): Promise<'created' | 'exists' | 'taken'>;
    /** Only the courier's own visit, within the tenant. */
    find(tenantId: string, courierId: string, id: string): Promise<Visit | null>;
    /**
     * Applies an event: arriving and reaching the door are recorded once (the first report wins),
     * and nothing changes on a visit that is already finished.
     */
    applyEvent(tenantId: string, courierId: string, id: string, type: VisitEventType, at: Date): Promise<Visit | null>;
    /** Stores new points; a point already stored (same visit and time) is skipped. Returns how many were new. */
    addPoints(tenantId: string, courierId: string, visitId: string, points: TrackPoint[]): Promise<number>;
    /** Deletes raw points older than `before`. Returns how many. */
    purgePointsBefore(before: Date): Promise<number>;
}

export const VISIT_REPOSITORY = Symbol('VisitRepository');
