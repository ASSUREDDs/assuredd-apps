import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bootstrapSession } from '@/entities/session/bootstrap';
// Registers the background tracking task. Must load with the app, even when it starts in the background.
import '@/features/tracking/lib/background-task';
import '@/shared/i18n';

const queryClient = new QueryClient();

export default function RootLayout() {
    useEffect(() => {
        void bootstrapSession();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
                <Stack screenOptions={{ headerShown: false }} />
            </SafeAreaProvider>
        </QueryClientProvider>
    );
}
