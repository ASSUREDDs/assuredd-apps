import { z } from 'zod';

const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
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