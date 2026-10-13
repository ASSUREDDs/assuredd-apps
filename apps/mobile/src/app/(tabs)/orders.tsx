import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/shared/ui/Screen';
import { colors } from '@/shared/ui/theme/colors';

export default function OrdersScreen() {
    const { t } = useTranslation();

    return (
        <Screen>
            <Text style={styles.title}>{t('orders.title')}</Text>
            <Text style={styles.empty}>{t('orders.empty')}</Text>
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
