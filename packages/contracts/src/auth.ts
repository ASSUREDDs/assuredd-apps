import { z } from 'zod';

export const LoginRequestSchema = z.object({
    email: z.email(),
    password: z.string().min(8, 'Min 8 symbols'),
});

export const LoginResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    user: z.object({
        id: z.uuid(),
        email: z.email(),
    }),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;