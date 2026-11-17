import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { point4326, polygon4326 } from './geometry';
import { tenants } from './tenants.schema';
import { users } from './users.schema';

export const obstacles = pgTable(
    'obstacles',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        tenantId: uuid('tenant_id')
            .notNull()
            .references(() => tenants.id),
        createdBy: uuid('created_by')
            .notNull()
            .references(() => users.id),
        kind: text('kind').notNull(),
        // Always a polygon: circles are buffered at insert, so routing can use it as an avoid zone.
        geom: polygon4326('geom').notNull(),
        center: point4326('center').notNull(),
        radiusM: integer('radius_m'),
        comment: text('comment'),
        photoKey: text('photo_key'),
        status: text('status').notNull().default('active'),
        expiresAt: timestamp('expires_at', { withTimezone: true }),
        removedAt: timestamp('removed_at', { withTimezone: true }),
        removedReason: text('removed_reason'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index('obstacles_geom_gist_idx').using('gist', table.geom),
        index('obstacles_tenant_status_idx').on(table.tenantId, table.status),
    ],
);

export const obstacleConfirmations = pgTable(
    'obstacle_confirmations',
    {
        obstacleId: uuid('obstacle_id')
            .notNull()
            .references(() => obstacles.id, { onDelete: 'cascade' }),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        vote: text('vote').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [primaryKey({ columns: [table.obstacleId, table.userId] })],
);
