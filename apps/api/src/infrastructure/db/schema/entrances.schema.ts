import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { point4326 } from './geometry';
import { tenants } from './tenants.schema';
import { users } from './users.schema';

export const entrances = pgTable(
    'entrances',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        tenantId: uuid('tenant_id')
            .notNull()
            .references(() => tenants.id),
        createdBy: uuid('created_by')
            .notNull()
            .references(() => users.id),
        house: point4326('house').notNull(),
        entrance: point4326('entrance').notNull(),
        label: text('label'),
        comment: text('comment'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index('entrances_house_gist_idx').using('gist', table.house), index('entrances_tenant_idx').on(table.tenantId)],
);
