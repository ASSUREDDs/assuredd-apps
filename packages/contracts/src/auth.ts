import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

export const GenderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export type Gender = z.infer<typeof GenderSchema>;

export const PhoneSchema = z
    .object({
        countryCode: z.string().regex(/^\+[1-9]\d{0,3}$/),
        number: z.string().min(1),
    })
    .refine((phone) => isValidPhoneNumber(`${phone.countryCode}${phone.number}`), {
        message: 'Invalid phone number for the given country code',
    });
export type Phone = z.infer<typeof PhoneSchema>;

export const AddressSchema = z.object({
    city: z.string().min(1),
    street: z.string().min(1),
    houseNumber: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
});
export type Address = z.infer<typeof AddressSchema>;

export const UserSchema = z.object({
    id: z.uuid(),
    email: z.email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: PhoneSchema,
    gender: GenderSchema,
    address: AddressSchema,
});
export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
    email: z.email(),
    password: z.string().min(8, 'Min 8 symbols'),
});

export const LoginResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    user: UserSchema,
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RegisterRequestSchema = z.object({
    email: z.email(),
    password: z.string().min(8, 'Min 8 symbols'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: PhoneSchema,
    gender: GenderSchema,
    address: AddressSchema,
});

export const RegisterResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    user: UserSchema,
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

export const RefreshRequestSchema = z.object({
    refreshToken: z.string(),
});

export const RefreshResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
});

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const LogoutRequestSchema = z.object({
    refreshToken: z.string(),
});

export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
