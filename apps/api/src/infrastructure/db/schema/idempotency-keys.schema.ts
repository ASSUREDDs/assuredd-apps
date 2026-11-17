import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const idempotencyKeys = pgTable(
    'idempotency_keys',
    {
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        key: text('key').notNull(),
        requestHash: text('request_hash').notNull(),
        responseStatus: integer('response_status'),
        responseBody: jsonb('response_body'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [primaryKey({ columns: [table.userId, table.key] }), index('idempotency_keys_created_at_idx').on(table.createdAt)],
);
