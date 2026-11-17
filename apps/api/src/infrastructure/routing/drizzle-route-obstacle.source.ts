import { sql } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';

import type { RouteObstacle, RouteObstacleKind, RouteObstacleSource } from '@domain/routing/route-obstacle-source';
import type { LngLat } from '@domain/shared/geo';
import { type Database, DB } from '@infrastructure/db';

type RouteObstacleRow = {
    id: string;
    kind: RouteObstacleKind;
    comment: string | null;
    lng: number;
    lat: number;
    geometry: { coordinates: LngLat[][] };
};

const SELECT = sql`
    SELECT o.id, o.kind, o.comment, ST_X(o.center) AS lng, ST_Y(o.center) AS lat, ST_AsGeoJSON(o.geom)::json AS geometry
    FROM obstacles o`;

const active = (tenantId: string, now: Date) => sql`
    o.tenant_id = ${tenantId}::uuid AND o.status = 'active'
    AND (o.expires_at IS NULL OR o.expires_at > ${now}::timestamptz)`;

function toRouteObstacle(row: RouteObstacleRow): RouteObstacle {
    return {
        id: row.id,
        kind: row.kind,
        comment: row.comment,
        center: [row.lng, row.lat],
        ring: row.geometry.coordinates[0],
    };
}

@Injectable()
export class DrizzleRouteObstacleSource implements RouteObstacleSource {
    constructor(@Inject(DB) private readonly db: Database) {}

    async findAtPoints(tenantId: string, points: LngLat[], now: Date): Promise<RouteObstacle[]> {
        if (points.length === 0) return [];
        const covers = sql.join(
            points.map((p) => sql`ST_Intersects(o.geom, ST_SetSRID(ST_MakePoint(${p[0]}::float8, ${p[1]}::float8), 4326))`),
            sql` OR `,
        );
        const result = await this.db.execute<RouteObstacleRow>(
            sql`${SELECT} WHERE ${active(tenantId, now)} AND (${covers})`,
        );
        return result.rows.map(toRouteObstacle);
    }

    async findCrossingLine(tenantId: string, line: LngLat[], now: Date, exceptIds: string[]): Promise<RouteObstacle[]> {
        const geojson = JSON.stringify({ type: 'LineString', coordinates: line });
        const except = exceptIds.length
            ? sql`AND o.id NOT IN (${sql.join(
                  exceptIds.map((id) => sql`${id}::uuid`),
                  sql`, `,
              )})`
            : sql``;
        const result = await this.db.execute<RouteObstacleRow>(sql`
            ${SELECT}
            WHERE ${active(tenantId, now)}
              AND ST_Intersects(o.geom, ST_SetSRID(ST_GeomFromGeoJSON(${geojson}::text), 4326))
              ${except}`);
        return result.rows.map(toRouteObstacle);
    }
}
