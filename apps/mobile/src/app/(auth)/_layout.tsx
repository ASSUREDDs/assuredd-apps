import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/entities/session/session.store';

export default function AuthLayout() {
    const status = useSessionStore((state) => state.status);

    if (status === 'authenticated') {
        return <Redirect href="/(tabs)" />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}
