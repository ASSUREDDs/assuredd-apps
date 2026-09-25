import { doublePrecision, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phoneCountryCode: text('phone_country_code').notNull(),
    phoneNumber: text('phone_number').notNull(),
    gender: text('gender').notNull(),
    addressCity: text('address_city').notNull(),
    addressStreet: text('address_street').notNull(),
    addressHouseNumber: text('address_house_number').notNull(),
    addressLatitude: doublePrecision('address_latitude').notNull(),
    addressLongitude: doublePrecision('address_longitude').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
