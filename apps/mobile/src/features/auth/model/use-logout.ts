import { useMutation } from '@tanstack/react-query';

import { useSessionStore } from '@/entities/session/session.store';
import { clearTokens } from '@/shared/api/token-storage';

import { logoutRequest } from '../api/auth.api';

export function useLogout() {
    const clear = useSessionStore((state) => state.clear);

    return useMutation({
        mutationFn: () => logoutRequest(),
        onSettled: async () => {
            await clearTokens();
            clear();
        },
    });
}
