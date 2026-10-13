import {
    IconClipboardList,
    IconClipboardListFilled,
    IconFileAnalytics,
    IconFileAnalyticsFilled,
    IconMapPin,
    IconMapPinFilled,
    IconUser,
    IconUserFilled,
} from '@tabler/icons-react-native';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSessionStore } from '@/entities/session/session.store';
import { colors } from '@/shared/ui/theme/colors';

const ICON_SIZE = 24;

export default function TabsLayout() {
    const status = useSessionStore((state) => state.status);
    const { t } = useTranslation();

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
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t('tabs.map'),
                    tabBarIcon: ({ color, focused }) =>
                        focused ? (
                            <IconMapPinFilled color={color} size={ICON_SIZE} />
                        ) : (
                            <IconMapPin color={color} size={ICON_SIZE} />
                        ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: t('tabs.orders'),
                    tabBarIcon: ({ color, focused }) =>
                        focused ? (
                            <IconClipboardListFilled color={color} size={ICON_SIZE} />
                        ) : (
                            <IconClipboardList color={color} size={ICON_SIZE} />
                        ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: t('tabs.reports'),
                    tabBarIcon: ({ color, focused }) =>
                        focused ? (
                            <IconFileAnalyticsFilled color={color} size={ICON_SIZE} />
                        ) : (
                            <IconFileAnalytics color={color} size={ICON_SIZE} />
                        ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t('tabs.profile'),
                    tabBarIcon: ({ color, focused }) =>
                        focused ? (
                            <IconUserFilled color={color} size={ICON_SIZE} />
                        ) : (
                            <IconUser color={color} size={ICON_SIZE} />
                        ),
                }}
            />
        </Tabs>
    );
}
