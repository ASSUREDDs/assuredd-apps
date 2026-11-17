import { sql } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';

import type { Entrance, NewEntrance } from '@domain/entrances/entrance.entity';
import type { EntranceRepository } from '@domain/entrances/entrance.repository';
import type { LngLat } from '@domain/shared/geo';
import { type Database, DB } from '@infrastructure/db';

type EntranceRow = {
    id: string;
    house_lng: number;
    house_lat: number;
    entrance_lng: number;
    entrance_lat: number;
    label: string | null;
    comment: string | null;
    created_by: string;
    // Raw `execute` results are not parsed by Drizzle: timestamptz arrives as a string.
    created_at: string;
}

const SELECT = sql`
    SELECT id, ST_X(house) AS house_lng, ST_Y(house) AS house_lat,
           ST_X(entrance) AS entrance_lng, ST_Y(entrance) AS entrance_lat,
           label, comment, created_by, created_at
    FROM entrances`;

function toEntrance(row: EntranceRow): Entrance {
    return {
        id: row.id,
        house: [row.house_lng, row.house_lat],
        entrance: [row.entrance_lng, row.entrance_lat],
        label: row.label,
        comment: row.comment,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
    };
}

const point = (p: LngLat) => sql`ST_SetSRID(ST_MakePoint(${p[0]}::float8, ${p[1]}::float8), 4326)`;

@Injectable()
export class DrizzleEntranceRepository implements EntranceRepository {
    constructor(@Inject(DB) private readonly db: Database) {}

    async create(entrance: NewEntrance): Promise<void> {
        await this.db.execute(sql`
            INSERT INTO entrances (id, tenant_id, created_by, house, entrance, label, comment, created_at)
            VALUES (${entrance.id}::uuid, ${entrance.tenantId}::uuid, ${entrance.createdBy}::uuid,
                    ${point(entrance.house)}, ${point(entrance.entrance)},
                    ${entrance.label}::text, ${entrance.comment}::text, ${entrance.createdAt}::timestamptz)`);
    }

    async findById(tenantId: string, id: string): Promise<Entrance | null> {
        const result = await this.db.execute<EntranceRow>(
            sql`${SELECT} WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`,
        );
        const [row] = result.rows;
        return row ? toEntrance(row) : null;
    }

    async searchNear(tenantId: string, center: LngLat, radiusM: number, limit: number): Promise<Entrance[]> {
        const result = await this.db.execute<EntranceRow>(sql`
            ${SELECT}
            WHERE tenant_id = ${tenantId}::uuid
              AND ST_DWithin(house::geography, ${point(center)}::geography, ${radiusM}::float8)
            ORDER BY house::geography <-> ${point(center)}::geography
            LIMIT ${limit}`);
        return result.rows.map(toEntrance);
    }

    async delete(id: string): Promise<void> {
        await this.db.execute(sql`DELETE FROM entrances WHERE id = ${id}::uuid`);
    }
}
