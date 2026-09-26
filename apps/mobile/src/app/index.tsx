import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSessionStore } from '@/entities/session/session.store';
import { colors } from '@/shared/ui/theme/colors';

export default function Index() {
    const status = useSessionStore((state) => state.status);

    if (status === 'idle' || status === 'loading') {
        return (
            <View style={styles.container}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return <Redirect href={status === 'authenticated' ? '/(tabs)' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
});
