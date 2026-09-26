import { IconHome, IconHomeFilled, IconUser, IconUserFilled } from '@tabler/icons-react-native';
import { Redirect, Tabs } from 'expo-router';

import { useSessionStore } from '@/entities/session/session.store';
import { colors } from '@/shared/ui/theme/colors';

export default function TabsLayout() {
    const status = useSessionStore((state) => state.status);

    if (status === 'idle' || status === 'loading') {
        return null;
    }

    if (status === 'unauthenticated') {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: { backgroundColor: colors.surface },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) =>
                        focused ? <IconHomeFilled color={color} size={24} /> : <IconHome color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) =>
                        focused ? <IconUserFilled color={color} size={24} /> : <IconUser color={color} size={24} />,
                }}
            />
        </Tabs>
    );
}
