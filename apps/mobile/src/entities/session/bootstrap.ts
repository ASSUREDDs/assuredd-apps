import { UserSchema } from '@app/contracts';

import { authorizedRequest } from '@/shared/api/authorized-request';
import { clearTokens, getTokens } from '@/shared/api/token-storage';

import { useSessionStore } from './session.store';

export async function bootstrapSession(): Promise<void> {
    useSessionStore.setState({ status: 'loading' });

    try {
        const tokens = await getTokens();

        if (tokens) {
            const user = await authorizedRequest('/auth/me', UserSchema);
            useSessionStore.getState().setSession(user);
            return;
        }
    } catch {
        // Reading SecureStore can fail on its own — Expo Go cannot decrypt items written
        // by a development build, for instance. Whatever broke, fall through to the login
        // screen instead of leaving the app on the splash spinner forever.
        await clearTokens().catch(() => undefined);
    }

    useSessionStore.setState({ status: 'unauthenticated', user: null });
}
