import { z } from 'zod';

const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    ACCESS_TOKEN_SECRET: z.string().min(32),
    REFRESH_TOKEN_SECRET: z.string().min(32),
    VALHALLA_URL: z.url().optional(),
    GEOCODER_URL: z.url().default('https://photon.komoot.io'),
    TRACK_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
    INCIDENT_TTL_SEC: z.coerce.number().int().positive().default(86400),
    OBSTACLE_DISMISS_THRESHOLD: z.coerce.number().int().min(1).default(3),
    ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
    REFRESH_TTL_SEC: z.coerce.number().int().positive().default(2592000),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
    const parsed = EnvSchema.safeParse(raw);
    if (!parsed.success) {
        throw new Error(
            `Wrong env:\n${z.prettifyError(parsed.error)}`,
        );
    }
    return parsed.data;
}