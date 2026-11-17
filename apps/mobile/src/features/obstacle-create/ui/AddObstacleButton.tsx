import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/shared/ui/theme/colors';

import { useObstacleDraft } from '../model/draft.store';

export function AddObstacleButton() {
    const { t } = useTranslation();
    const start = useObstacleDraft((s) => s.start);

    return (
        <Pressable
            onPress={start}
            accessibilityLabel={t('obstacle.add')}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
            <Text style={styles.plus}>+</Text>
            <Text style={styles.label}>{t('obstacle.add')}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        paddingHorizontal: 18,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    pressed: {
        backgroundColor: colors.primaryPressed,
    },
    plus: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.textInverse,
        marginTop: -2,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textInverse,
    },
});
