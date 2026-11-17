import type { Obstacle, ObstacleVote } from '@app/contracts';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OBSTACLE_COLORS, OBSTACLE_KIND_LABEL_KEYS } from '@/entities/obstacle/lib/obstacle-style';
import { formatAge } from '@/shared/lib/format-age';
import { Button } from '@/shared/ui/Button';
import { colors } from '@/shared/ui/theme/colors';

interface ObstacleCardProps {
    obstacle: Obstacle;
    /** The author can take their own obstacle down at once. */
    canRemove: boolean;
    isBusy: boolean;
    hasError: boolean;
    onVote: (vote: ObstacleVote) => void;
    onRemove: () => void;
    onClose: () => void;
}

export function ObstacleCard({ obstacle, canRemove, isBusy, hasError, onVote, onRemove, onClose }: ObstacleCardProps) {
    const { t } = useTranslation();
    const { stillRelevant, noLongerRelevant } = obstacle.confirmations;

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

            <Text style={styles.meta}>
                {t('obstacle.added', { age: formatAge(obstacle.createdAt, t) })}
                {obstacle.expiresAt ? ` · ${t('obstacle.expiresAuto')}` : ''}
            </Text>
            <Text style={styles.meta}>{t('obstacle.votes', { yes: stillRelevant, no: noLongerRelevant })}</Text>

            {hasError ? <Text style={styles.error}>{t('obstacle.actionFailed')}</Text> : null}

            <View style={styles.actions}>
                <View style={styles.action}>
                    <Button
                        label={t('obstacle.stillRelevant')}
                        onPress={() => onVote('still_relevant')}
                        disabled={isBusy || obstacle.myVote === 'still_relevant'}
                    />
                </View>
                <View style={styles.action}>
                    <Button
                        label={t('obstacle.noLongerRelevant')}
                        variant="secondary"
                        onPress={() => onVote('no_longer_relevant')}
                        disabled={isBusy || obstacle.myVote === 'no_longer_relevant'}
                    />
                </View>
            </View>

            {canRemove ? (
                <Pressable onPress={onRemove} disabled={isBusy} hitSlop={8}>
                    <Text style={styles.remove}>{t('obstacle.remove')}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        gap: 8,
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
    meta: {
        fontSize: 13,
        color: colors.textMuted,
    },
    error: {
        fontSize: 13,
        color: colors.danger,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    action: {
        flex: 1,
    },
    remove: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.danger,
        textAlign: 'center',
        marginTop: 4,
    },
});
