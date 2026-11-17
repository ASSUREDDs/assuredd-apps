import { bigserial, index, pgTable, real, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { point4326 } from './geometry';
import { tenants } from './tenants.schema';
import { users } from './users.schema';

export const deliveryVisits = pgTable(
    'delivery_visits',
    {
        // Created on the phone, so starting a visit is safe to repeat and works offline.
        id: uuid('id').primaryKey(),
        tenantId: uuid('tenant_id')
            .notNull()
            .references(() => tenants.id),
        courierId: uuid('courier_id')
            .notNull()
            .references(() => users.id),
        destination: point4326('destination').notNull(),
        label: text('label'),
        status: text('status').notNull().default('active'),
        startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
        arrivedAt: timestamp('arrived_at', { withTimezone: true }),
        doorAt: timestamp('door_at', { withTimezone: true }),
        finishedAt: timestamp('finished_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index('delivery_visits_tenant_started_idx').on(table.tenantId, table.startedAt)],
);

/** Raw GPS points. Deleted after the retention period; the visit row keeps the numbers. */
export const trackPoints = pgTable(
    'track_points',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        visitId: uuid('visit_id')
            .notNull()
            .references(() => deliveryVisits.id, { onDelete: 'cascade' }),
        tenantId: uuid('tenant_id')
            .notNull()
            .references(() => tenants.id),
        courierId: uuid('courier_id')
            .notNull()
            .references(() => users.id),
        recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
        geom: point4326('geom').notNull(),
        accuracyM: real('accuracy_m'),
    },
    (table) => [
        // The same point sent twice (a retried batch) is stored once.
        unique('track_points_visit_time_unique').on(table.visitId, table.recordedAt),
        index('track_points_recorded_at_idx').on(table.recordedAt),
    ],
);
