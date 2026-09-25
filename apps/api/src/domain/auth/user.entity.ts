export const Gender = {
    Male: 'male',
    Female: 'female',
    Other: 'other',
    PreferNotToSay: 'prefer_not_to_say',
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

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
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        gender: user.gender,
        address: user.address,
        createdAt: user.createdAt,
    };
}
