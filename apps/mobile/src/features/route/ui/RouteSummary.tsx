import type { RouteChangeReason, RoutePlan } from '@app/contracts';
import { RouteErrorCode } from '@app/contracts';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { OBSTACLE_KIND_LABEL_KEYS } from '@/entities/obstacle/lib/obstacle-style';
import type { RouteStatus } from '@/entities/route/model/use-route';
import { ApiError } from '@/shared/api/http';
import { colors } from '@/shared/ui/theme/colors';

import { formatDistance, formatDuration } from '../lib/format';

interface RouteSummaryProps {
    status: RouteStatus;
    plan: RoutePlan | null;
    error: Error | null;
    notice: RouteChangeReason[] | null;
    /** The route is being rechecked or rebuilt because obstacles changed. */
    isUpdating?: boolean;
    onDismissNotice: () => void;
    onClear: () => void;
}

const ERROR_KEYS: Record<string, string> = {
    [RouteErrorCode.NotFound]: 'route.errors.notFound',
    [RouteErrorCode.Blocked]: 'route.errors.blocked',
    [RouteErrorCode.TooLong]: 'route.errors.tooLong',
    [RouteErrorCode.Unavailable]: 'route.errors.unavailable',
};

export function RouteSummary({ status, plan, error, notice, isUpdating, onDismissNotice, onClear }: RouteSummaryProps) {
    const { t } = useTranslation();

    if (status === 'idle') return null;

    const errorKey = error instanceof ApiError && error.code ? ERROR_KEYS[error.code] : undefined;

    return (
        <View style={styles.wrapper}>
            {notice && notice.length > 0 ? (
                <Pressable onPress={onDismissNotice} style={styles.notice}>
                    <View style={styles.noticeText}>
                        {notice.map((reason, index) => (
                            <Text key={index} style={styles.noticeLine}>
                                {describeChange(reason, t)}
                            </Text>
                        ))}
                    </View>
                    <Text style={styles.noticeClose}>✕</Text>
                </Pressable>
            ) : null}

            <View style={styles.card}>
                {isUpdating && status !== 'loading' ? (
                    <View style={styles.updating}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.updatingLabel}>{t('route.updating')}</Text>
                    </View>
                ) : null}
                <View style={styles.row}>
                    <View style={styles.body}>
                        {status === 'loading' ? (
                            <View style={styles.row}>
                                <ActivityIndicator color={colors.primary} />
                                <Text style={styles.muted}>{t('route.building')}</Text>
                            </View>
                        ) : null}

                        {status === 'error' ? (
                            <Text style={styles.error}>{t(errorKey ?? 'route.errors.generic')}</Text>
                        ) : null}

                        {status === 'ready' && plan ? (
                            <>
                                <Text style={styles.headline}>
                                    {formatDistance(plan.distanceM, t)} · {formatDuration(plan.durationS, t)}
                                </Text>
                                <Text style={styles.muted}>
                                    {plan.destination.source === 'entrance' ? t('route.toEntrance') : t('route.toAddress')}
                                </Text>
                                {plan.avoided.length > 0 ? (
                                    <Text style={styles.muted}>{t('route.avoiding', { count: plan.avoided.length })}</Text>
                                ) : null}
                                {plan.warnings.map((warning) => (
                                    <Text key={warning.id} style={styles.warning}>
                                        {t('route.warningAtDestination', { kind: t(OBSTACLE_KIND_LABEL_KEYS[warning.kind]) })}
                                    </Text>
                                ))}
                            </>
                        ) : null}
                    </View>
                    <Pressable onPress={onClear} hitSlop={12}>
                        <Text style={styles.close}>✕</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

function describeChange(reason: RouteChangeReason, t: (key: string, options?: Record<string, unknown>) => string): string {
    switch (reason.type) {
        case 'obstacle_added':
            return t('route.changed.obstacleAdded', { kind: t(OBSTACLE_KIND_LABEL_KEYS[reason.obstacle.kind]).toLowerCase() });
        case 'obstacle_removed':
            return t('route.changed.obstacleRemoved');
        case 'destination_changed':
            return t('route.changed.destination');
    }
}

const styles = StyleSheet.create({
    wrapper: {
        gap: 8,
    },
    notice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.primaryPressed,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    noticeText: {
        flex: 1,
        gap: 2,
    },
    noticeLine: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textInverse,
    },
    noticeClose: {
        fontSize: 16,
        color: colors.textInverse,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    updating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    updatingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primaryPressed,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    body: {
        flex: 1,
        gap: 3,
    },
    headline: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    muted: {
        fontSize: 14,
        color: colors.textMuted,
    },
    warning: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.danger,
    },
    error: {
        fontSize: 15,
        color: colors.danger,
    },
    close: {
        fontSize: 18,
        color: colors.textMuted,
    },
});
