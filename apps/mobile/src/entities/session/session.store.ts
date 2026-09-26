import type { User } from '@app/contracts';
import { create } from 'zustand';

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
    setSession: (user) => set({ user, status: 'authenticated' }),
    clear: () => set({ user: null, status: 'unauthenticated' }),
}));
