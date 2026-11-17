import { type SQL, sql } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';

import type {
    NewObstacle,
    ObstacleKind,
    ObstacleStatus,
    ObstacleView,
    ObstacleVote,
    RemovalReason,
} from '@domain/obstacles/obstacle.entity';
import type { ObstacleRepository, ObstacleSearch } from '@domain/obstacles/obstacle.repository';
import type { LngLat } from '@domain/shared/geo';
import { type Database, DB } from '@infrastructure/db';

type ObstacleRow = {
    id: string;
    kind: ObstacleKind;
    status: ObstacleStatus;
    comment: string | null;
    radius_m: number | null;
    // Raw `execute` results are not parsed by Drizzle: timestamptz arrives as a string.
    expires_at: string | null;
    created_at: string;
    created_by: string;
    geometry: { coordinates: LngLat[][] };
    lng: number;
    lat: number;
    still_relevant: number;
    no_longer_relevant: number;
    my_vote: ObstacleVote | null;
}

function viewSelect(userId: string): SQL {
    return sql`
        SELECT o.id, o.kind, o.status, o.comment, o.radius_m, o.expires_at, o.created_at, o.created_by,
               ST_AsGeoJSON(o.geom)::json AS geometry,
               ST_X(o.center) AS lng, ST_Y(o.center) AS lat,
               COALESCE(c.still_relevant, 0)::int AS still_relevant,
               COALESCE(c.no_longer_relevant, 0)::int AS no_longer_relevant,
               mv.vote AS my_vote
        FROM obstacles o
        LEFT JOIN LATERAL (
            SELECT count(*) FILTER (WHERE vote = 'still_relevant') AS still_relevant,
                   count(*) FILTER (WHERE vote = 'no_longer_relevant') AS no_longer_relevant
            FROM obstacle_confirmations WHERE obstacle_id = o.id
        ) c ON true
        LEFT JOIN obstacle_confirmations mv ON mv.obstacle_id = o.id AND mv.user_id = ${userId}::uuid`;
}

function toView(row: ObstacleRow): ObstacleView {
    return {
        id: row.id,
        kind: row.kind,
        status: row.status,
        center: [row.lng, row.lat],
        radiusM: row.radius_m,
        geometry: row.geometry.coordinates,
        comment: row.comment,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
        confirmations: { stillRelevant: row.still_relevant, noLongerRelevant: row.no_longer_relevant },
        myVote: row.my_vote,
    };
}

@Injectable()
export class DrizzleObstacleRepository implements ObstacleRepository {
    constructor(@Inject(DB) private readonly db: Database) {}

    async create(obstacle: NewObstacle, maxAreaM2: number): Promise<boolean> {
        const { shape } = obstacle;
        const geom =
            shape.type === 'circle'
                ? sql`ST_Buffer(ST_SetSRID(ST_MakePoint(${shape.center[0]}::float8, ${shape.center[1]}::float8), 4326)::geography, ${shape.radiusM}::float8, 8)::geometry`
                : sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify({ type: 'Polygon', coordinates: [shape.ring] })}::text), 4326)`;
        const center =
            shape.type === 'circle'
                ? sql`ST_SetSRID(ST_MakePoint(${shape.center[0]}::float8, ${shape.center[1]}::float8), 4326)`
                : sql`ST_PointOnSurface(g.geom)`;
        const radius = shape.type === 'circle' ? shape.radiusM : null;

        const result = await this.db.execute(sql`
            WITH g AS (SELECT ${geom} AS geom)
            INSERT INTO obstacles (id, tenant_id, created_by, kind, geom, center, radius_m, comment, expires_at, created_at)
            SELECT ${obstacle.id}::uuid, ${obstacle.tenantId}::uuid, ${obstacle.createdBy}::uuid, ${obstacle.kind},
                   g.geom, ${center}, ${radius}::int, ${obstacle.comment}::text,
                   ${obstacle.expiresAt}::timestamptz, ${obstacle.createdAt}::timestamptz
            FROM g
            WHERE GeometryType(g.geom) = 'POLYGON'
              AND ST_IsValid(g.geom)
              AND ST_Area(g.geom::geography) <= ${maxAreaM2}::float8
            RETURNING id`);

        return result.rows.length > 0;
    }

    async findView(tenantId: string, userId: string, id: string): Promise<ObstacleView | null> {
        const result = await this.db.execute<ObstacleRow>(
            sql`${viewSelect(userId)} WHERE o.id = ${id}::uuid AND o.tenant_id = ${tenantId}::uuid`,
        );
        const [row] = result.rows;
        return row ? toView(row) : null;
    }

    async search(query: ObstacleSearch): Promise<ObstacleView[]> {
        const { area } = query;
        const areaFilter =
            area.type === 'bbox'
                ? sql`ST_Intersects(o.geom, ST_MakeEnvelope(${area.west}::float8, ${area.south}::float8, ${area.east}::float8, ${area.north}::float8, 4326))`
                : sql`ST_DWithin(o.geom::geography, ST_SetSRID(ST_MakePoint(${area.center[0]}::float8, ${area.center[1]}::float8), 4326)::geography, ${area.radiusM}::float8)`;
        const kindFilter = query.kinds?.length
            ? sql`AND o.kind IN (${sql.join(
                  query.kinds.map((kind) => sql`${kind}`),
                  sql`, `,
              )})`
            : sql``;

        const result = await this.db.execute<ObstacleRow>(sql`
            ${viewSelect(query.userId)}
            WHERE o.tenant_id = ${query.tenantId}::uuid
              AND o.status = 'active'
              AND (o.expires_at IS NULL OR o.expires_at > ${query.now}::timestamptz)
              AND ${areaFilter}
              ${kindFilter}
            ORDER BY o.created_at DESC
            LIMIT ${query.limit}`);

        return result.rows.map(toView);
    }

    async upsertVote(obstacleId: string, userId: string, vote: ObstacleVote, now: Date): Promise<void> {
        await this.db.execute(sql`
            INSERT INTO obstacle_confirmations (obstacle_id, user_id, vote, created_at, updated_at)
            VALUES (${obstacleId}::uuid, ${userId}::uuid, ${vote}, ${now}::timestamptz, ${now}::timestamptz)
            ON CONFLICT (obstacle_id, user_id) DO UPDATE SET vote = EXCLUDED.vote, updated_at = EXCLUDED.updated_at`);
    }

    async extendExpiry(obstacleId: string, expiresAt: Date): Promise<void> {
        await this.db.execute(
            sql`UPDATE obstacles SET expires_at = ${expiresAt}::timestamptz WHERE id = ${obstacleId}::uuid AND expires_at IS NOT NULL`,
        );
    }

    async markInactive(obstacleId: string, status: ObstacleStatus, reason: RemovalReason, now: Date): Promise<void> {
        await this.db.execute(sql`
            UPDATE obstacles SET status = ${status}, removed_reason = ${reason}, removed_at = ${now}::timestamptz
            WHERE id = ${obstacleId}::uuid AND status = 'active'`);
    }

    async expireDue(now: Date): Promise<number> {
        const result = await this.db.execute(sql`
            UPDATE obstacles SET status = 'expired', removed_reason = 'expired', removed_at = ${now}::timestamptz
            WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= ${now}::timestamptz`);
        return result.rowCount ?? 0;
    }
}
