import { UserSchema } from '@app/contracts';

import { authorizedRequest } from '@/shared/api/authorized-request';
import { clearTokens, getTokens } from '@/shared/api/token-storage';

import { useSessionStore } from './session.store';

export async function bootstrapSession(): Promise<void> {
    useSessionStore.setState({ status: 'loading' });

    const tokens = await getTokens();
    if (!tokens) {
        useSessionStore.setState({ status: 'unauthenticated', user: null });
        return;
    }

    try {
        const user = await authorizedRequest('/auth/me', UserSchema);
        useSessionStore.getState().setSession(user);
    } catch {
        await clearTokens();
        useSessionStore.setState({ status: 'unauthenticated', user: null });
    }
}
