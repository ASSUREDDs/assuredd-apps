import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/shared/ui/Screen';
import { colors } from '@/shared/ui/theme/colors';

export default function ReportsScreen() {
    return (
        <Screen>
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.empty}>You have no reports yet.</Text>
        </Screen>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    empty: {
        fontSize: 16,
        color: colors.textMuted,
    },
});
