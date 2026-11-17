export const Gender = {
    Male: 'male',
    Female: 'female',
    Other: 'other',
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

export const UserRole = {
    Courier: 'courier',
    Admin: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// MVP: every self-registered user joins this tenant (seeded by migration). Admins reassign later.
export const DEFAULT_TENANT_ID = '00000000-0000-4000-8000-000000000001';

export interface Phone {
    countryCode: string;
    number: string;
}

export interface Address {
    city: string;
    street: string;
    houseNumber: string;
    latitude: number;
    longitude: number;
}

export interface User {
    id: string;
    tenantId: string;
    role: UserRole;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone: Phone;
    gender: Gender;
    address: Address;
    createdAt: Date;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser(user: User): PublicUser {
    return {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        gender: user.gender,
        address: user.address,
        createdAt: user.createdAt,
    };
}
