import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OBSTACLE_COLORS, OBSTACLE_KIND_LABEL_KEYS } from '@/entities/obstacle/lib/obstacle-style';
import type { PendingObstacle } from '@/entities/obstacle/lib/pending-obstacle';
import { Button } from '@/shared/ui/Button';
import { colors } from '@/shared/ui/theme/colors';

interface PendingObstacleCardProps {
    obstacle: PendingObstacle;
    onCancel: () => void;
    onClose: () => void;
}

/** An obstacle saved on the phone while offline. It cannot be confirmed yet, only withdrawn. */
export function PendingObstacleCard({ obstacle, onCancel, onClose }: PendingObstacleCardProps) {
    const { t } = useTranslation();

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={[styles.dot, { backgroundColor: OBSTACLE_COLORS[obstacle.kind] }]} />
                <Text style={styles.title}>{t(OBSTACLE_KIND_LABEL_KEYS[obstacle.kind])}</Text>
                <Pressable onPress={onClose} hitSlop={12}>
                    <Text style={styles.close}>✕</Text>
                </Pressable>
            </View>

            {obstacle.comment ? <Text style={styles.comment}>{obstacle.comment}</Text> : null}
            <Text style={styles.hint}>{t('obstacle.pendingHint')}</Text>

            <Button label={t('obstacle.cancelPending')} variant="secondary" onPress={onCancel} />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        opacity: 0.6,
    },
    title: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    close: {
        fontSize: 18,
        color: colors.textMuted,
    },
    comment: {
        fontSize: 15,
        color: colors.textPrimary,
    },
    hint: {
        fontSize: 14,
        color: colors.textMuted,
    },
});
