import { eq } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';

import type { User } from '@domain/auth/user.entity';
import type { UserRepository } from '@domain/auth/user.repository';
import { type Database, DB } from '@infrastructure/db';
import { users } from '@infrastructure/db/schema';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
    constructor(@Inject(DB) private readonly db: Database) {}

    async findByEmail(email: string): Promise<User | null> {
        const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
        return row ? this.toDomain(row) : null;
    }

    async findById(id: string): Promise<User | null> {
        const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
        return row ? this.toDomain(row) : null;
    }

    async save(user: User): Promise<void> {
        await this.db.insert(users).values({
            id: user.id,
            email: user.email,
            passwordHash: user.passwordHash,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneCountryCode: user.phone.countryCode,
            phoneNumber: user.phone.number,
            gender: user.gender,
            addressCity: user.address.city,
            addressStreet: user.address.street,
            addressHouseNumber: user.address.houseNumber,
            addressLatitude: user.address.latitude,
            addressLongitude: user.address.longitude,
            createdAt: user.createdAt,
        });
    }

    private toDomain(row: typeof users.$inferSelect): User {
        return {
            id: row.id,
            email: row.email,
            passwordHash: row.passwordHash,
            firstName: row.firstName,
            lastName: row.lastName,
            phone: { countryCode: row.phoneCountryCode, number: row.phoneNumber },
            gender: row.gender as User['gender'],
            address: {
                city: row.addressCity,
                street: row.addressStreet,
                houseNumber: row.addressHouseNumber,
                latitude: row.addressLatitude,
                longitude: row.addressLongitude,
            },
            createdAt: row.createdAt,
        };
    }
}
