import { sql } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';

import type { LngLat } from '@domain/shared/geo';
import type { NewVisit, TrackPoint, Visit, VisitEventType, VisitStatus } from '@domain/visits/visit.entity';
import type { VisitRepository } from '@domain/visits/visit.repository';
import { type Database, DB } from '@infrastructure/db';

// Raw `execute` results are not parsed by Drizzle: timestamptz arrives as a string and counts as text.
type VisitRow = {
    id: string;
    lng: number;
    lat: number;
    label: string | null;
    status: VisitStatus;
    started_at: string;
    arrived_at: string | null;
    door_at: string | null;
    finished_at: string | null;
    point_count: number;
};

const SELECT = sql`
    SELECT v.id, ST_X(v.destination) AS lng, ST_Y(v.destination) AS lat, v.label, v.status,
           v.started_at, v.arrived_at, v.door_at, v.finished_at,
           (SELECT count(*) FROM track_points p WHERE p.visit_id = v.id)::int AS point_count
    FROM delivery_visits v`;

const toDate = (value: string | null): Date | null => (value ? new Date(value) : null);

function toVisit(row: VisitRow): Visit {
    return {
        id: row.id,
        destination: [row.lng, row.lat] as LngLat,
        label: row.label,
        status: row.status,
        startedAt: new Date(row.started_at),
        arrivedAt: toDate(row.arrived_at),
        doorAt: toDate(row.door_at),
        finishedAt: toDate(row.finished_at),
        pointCount: row.point_count,
    };
}

@Injectable()
export class DrizzleVisitRepository implements VisitRepository {
    constructor(@Inject(DB) private readonly db: Database) {}

    async create(visit: NewVisit): Promise<'created' | 'exists' | 'taken'> {
        const inserted = await this.db.execute(sql`
            INSERT INTO delivery_visits (id, tenant_id, courier_id, destination, label, started_at)
            VALUES (${visit.id}::uuid, ${visit.tenantId}::uuid, ${visit.courierId}::uuid,
                    ST_SetSRID(ST_MakePoint(${visit.destination[0]}::float8, ${visit.destination[1]}::float8), 4326),
                    ${visit.label}::text, ${visit.startedAt}::timestamptz)
            ON CONFLICT (id) DO NOTHING
            RETURNING id`);
        if (inserted.rows.length > 0) return 'created';

        // The id exists already: a repeat from the same courier, or somebody else's visit.
        const owner = await this.db.execute<{ courier_id: string; tenant_id: string }>(
            sql`SELECT courier_id, tenant_id FROM delivery_visits WHERE id = ${visit.id}::uuid`,
        );
        const row = owner.rows[0];
        return row && row.courier_id === visit.courierId && row.tenant_id === visit.tenantId ? 'exists' : 'taken';
    }

    async find(tenantId: string, courierId: string, id: string): Promise<Visit | null> {
        const result = await this.db.execute<VisitRow>(
            sql`${SELECT} WHERE v.id = ${id}::uuid AND v.tenant_id = ${tenantId}::uuid AND v.courier_id = ${courierId}::uuid`,
        );
        const [row] = result.rows;
        return row ? toVisit(row) : null;
    }

    async applyEvent(tenantId: string, courierId: string, id: string, type: VisitEventType, at: Date): Promise<Visit | null> {
        const own = sql`id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND courier_id = ${courierId}::uuid AND status = 'active'`;
        const when = sql`${at}::timestamptz`;

        // Only an active visit changes; a finished one answers with what it already has.
        switch (type) {
            case 'arrived_at_house':
                await this.db.execute(sql`UPDATE delivery_visits SET arrived_at = COALESCE(arrived_at, ${when}) WHERE ${own}`);
                break;
            case 'reached_door':
                await this.db.execute(sql`
                    UPDATE delivery_visits
                    SET door_at = COALESCE(door_at, ${when}), status = 'completed', finished_at = COALESCE(finished_at, ${when})
                    WHERE ${own}`);
                break;
            case 'cancelled':
                await this.db.execute(sql`
                    UPDATE delivery_visits SET status = 'cancelled', finished_at = COALESCE(finished_at, ${when}) WHERE ${own}`);
                break;
        }

        return this.find(tenantId, courierId, id);
    }

    async addPoints(tenantId: string, courierId: string, visitId: string, points: TrackPoint[]): Promise<number> {
        const values = sql.join(
            points.map(
                (point) => sql`(${visitId}::uuid, ${tenantId}::uuid, ${courierId}::uuid, ${point.at}::timestamptz,
                    ST_SetSRID(ST_MakePoint(${point.position[0]}::float8, ${point.position[1]}::float8), 4326), ${point.accuracyM}::real)`,
            ),
            sql`, `,
        );

        const result = await this.db.execute(sql`
            INSERT INTO track_points (visit_id, tenant_id, courier_id, recorded_at, geom, accuracy_m)
            VALUES ${values}
            ON CONFLICT (visit_id, recorded_at) DO NOTHING
            RETURNING id`);
        return result.rows.length;
    }

    async purgePointsBefore(before: Date): Promise<number> {
        const result = await this.db.execute(sql`DELETE FROM track_points WHERE recorded_at < ${before}::timestamptz`);
        return result.rowCount ?? 0;
    }
}
