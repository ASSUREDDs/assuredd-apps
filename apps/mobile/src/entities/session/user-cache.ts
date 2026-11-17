import { UserSchema, type User } from '@app/contracts';

import { fileStorage } from '@/shared/lib/file-storage';

const CACHE_NAME = 'session-user';

/** The last known profile, so the app can open without a connection. Not a secret: tokens live in SecureStore. */
export async function saveCachedUser(user: User): Promise<void> {
    await fileStorage.setItem(CACHE_NAME, JSON.stringify(user));
}

export async function loadCachedUser(): Promise<User | null> {
    const raw = await fileStorage.getItem(CACHE_NAME);
    if (!raw) return null;

    try {
        const parsed = UserSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
    } catch {
        return null;
    }
}

export async function clearCachedUser(): Promise<void> {
    await fileStorage.removeItem(CACHE_NAME);
}
