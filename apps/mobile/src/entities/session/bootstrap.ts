import { UserSchema } from '@app/contracts';

import { authorizedRequest } from '@/shared/api/authorized-request';
import { ApiError, isTransientError } from '@/shared/api/http';
import { clearTokens, getTokens } from '@/shared/api/token-storage';

import { useSessionStore } from './session.store';
import { loadCachedUser } from './user-cache';

export async function bootstrapSession(): Promise<void> {
    useSessionStore.setState({ status: 'loading' });

    try {
        const tokens = await getTokens();

        if (tokens) {
            const user = await authorizedRequest('/auth/me', UserSchema);
            useSessionStore.getState().setSession(user);
            return;
        }
    } catch (error) {
        // No connection (or a server hiccup) is not a reason to sign out: open with the last known profile
        // and let the app work offline. Only a refusal from the server ends the session.
        if (isTransientError(error)) {
            const cached = await loadCachedUser();
            if (cached) {
                useSessionStore.setState({ user: cached, status: 'authenticated' });
                return;
            }
        } else if (error instanceof ApiError || error instanceof Error) {
            await clearTokens().catch(() => undefined);
        }
    }

    useSessionStore.setState({ status: 'unauthenticated', user: null });
}
