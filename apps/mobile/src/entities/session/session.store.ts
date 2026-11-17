import type { User } from '@app/contracts';
import { create } from 'zustand';

import { clearCachedUser, saveCachedUser } from './user-cache';

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
    user: User | null;
    status: SessionStatus;
    setSession: (user: User) => void;
    clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    user: null,
    status: 'idle',
    setSession: (user) => {
        void saveCachedUser(user);
        set({ user, status: 'authenticated' });
    },
    clear: () => {
        void clearCachedUser();
        set({ user: null, status: 'unauthenticated' });
    },
}));
