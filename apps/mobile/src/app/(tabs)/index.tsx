import { StyleSheet, Text } from 'react-native';

import { useSessionStore } from '@/entities/session/session.store';
import { Screen } from '@/shared/ui/Screen';
import { colors } from '@/shared/ui/theme/colors';

export default function HomeScreen() {
    const user = useSessionStore((state) => state.user);

    return (
        <Screen>
            <Text style={styles.greeting}>Hi, {user?.firstName ?? 'there'}</Text>
        </Screen>
    );
}

const styles = StyleSheet.create({
    greeting: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
    },
});
