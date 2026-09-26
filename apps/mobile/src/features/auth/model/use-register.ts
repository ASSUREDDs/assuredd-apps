import type { RegisterRequest } from '@app/contracts';
import { useMutation } from '@tanstack/react-query';

import { useSessionStore } from '@/entities/session/session.store';
import { setTokens } from '@/shared/api/token-storage';

import { registerRequest } from '../api/auth.api';

export function useRegister() {
    const setSession = useSessionStore((state) => state.setSession);

    return useMutation({
        mutationFn: (input: RegisterRequest) => registerRequest(input),
        onSuccess: async (response) => {
            await setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
            setSession(response.user);
        },
    });
}
