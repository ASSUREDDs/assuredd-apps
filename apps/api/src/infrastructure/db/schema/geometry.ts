import { customType } from 'drizzle-orm/pg-core';

/**
 * PostGIS columns are read and written with raw SQL (ST_* functions) in repositories,
 * so the schema only needs to know the column type for migrations.
 */
export const polygon4326 = customType<{ data: never }>({
    dataType: () => 'geometry(Polygon,4326)',
});

export const point4326 = customType<{ data: never }>({
    dataType: () => 'geometry(Point,4326)',
});
