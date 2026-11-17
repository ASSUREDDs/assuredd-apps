import type { ObstacleKind } from '@app/contracts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { OBSTACLE_COLORS, OBSTACLE_KIND_LABEL_KEYS, OBSTACLE_KINDS } from '@/entities/obstacle/lib/obstacle-style';
import { useCreateObstacle } from '@/entities/obstacle/model/use-obstacles';
import { useSessionStore } from '@/entities/session/session.store';
import { Button } from '@/shared/ui/Button';
import { colors } from '@/shared/ui/theme/colors';

import { RADIUS_OPTIONS_M, useObstacleDraft } from '../model/draft.store';

/**
 * The add flow in three taps: pick a type, tap the place on the map, send.
 * Radius and comment are optional extras on the second step.
 */
export function DraftPanel() {
    const { t } = useTranslation();
    const [showComment, setShowComment] = useState(false);
    const draft = useObstacleDraft();
    const userId = useSessionStore((state) => state.user?.id ?? null);
    const create = useCreateObstacle(userId);

    if (draft.step === 'idle') return null;

    function close() {
        if (create.isPending) return;
        setShowComment(false);
        create.reset();
        draft.cancel();
    }

    function submit() {
        if (!draft.kind || !draft.point || !draft.idempotencyKey) return;

        // The hook waits for the obstacle list to refresh before this succeeds, so the new marker
        // is already on the map when the panel closes.
        create.mutate(
            {
                input: {
                    kind: draft.kind,
                    shape: { type: 'circle', center: draft.point, radiusM: draft.radiusM },
                    comment: draft.comment.trim() || undefined,
                },
                idempotencyKey: draft.idempotencyKey,
            },
            {
                onSuccess: () => {
                    setShowComment(false);
                    create.reset();
                    draft.cancel();
                },
            },
        );
    }

    return (
        <View style={styles.panel}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('obstacle.add')}</Text>
                <Pressable onPress={close} disabled={create.isPending} hitSlop={12}>
                    <Text style={[styles.close, create.isPending && styles.closeDisabled]}>✕</Text>
                </Pressable>
            </View>

            {draft.step === 'kind' ? (
                <>
                    <Text style={styles.hint}>{t('obstacle.chooseKind')}</Text>
                    <View style={styles.kinds}>
                        {OBSTACLE_KINDS.map((kind: ObstacleKind) => (
                            <Pressable
                                key={kind}
                                onPress={() => draft.chooseKind(kind)}
                                style={({ pressed }) => [styles.kind, pressed && styles.kindPressed]}
                            >
                                <View style={[styles.kindDot, { backgroundColor: OBSTACLE_COLORS[kind] }]} />
                                <Text style={styles.kindLabel}>{t(OBSTACLE_KIND_LABEL_KEYS[kind])}</Text>
                            </Pressable>
                        ))}
                    </View>
                </>
            ) : (
                <>
                    <Text style={styles.hint}>{draft.point ? t('obstacle.pointSet') : t('obstacle.tapMap')}</Text>

                    <View style={styles.radii}>
                        {RADIUS_OPTIONS_M.map((radius) => (
                            <Pressable
                                key={radius}
                                onPress={() => draft.setRadius(radius)}
                                style={[styles.radius, draft.radiusM === radius && styles.radiusOn]}
                            >
                                <Text style={[styles.radiusLabel, draft.radiusM === radius && styles.radiusLabelOn]}>
                                    {t('obstacle.radius', { meters: radius })}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {showComment ? (
                        <TextInput
                            value={draft.comment}
                            onChangeText={draft.setComment}
                            placeholder={t('obstacle.commentPlaceholder')}
                            placeholderTextColor={colors.textMuted}
                            maxLength={500}
                            style={styles.comment}
                        />
                    ) : (
                        <Pressable onPress={() => setShowComment(true)} hitSlop={8}>
                            <Text style={styles.addComment}>{t('obstacle.addComment')}</Text>
                        </Pressable>
                    )}

                    {create.isError ? <Text style={styles.error}>{t('obstacle.createFailed')}</Text> : null}

                    <Button
                        label={t('obstacle.send')}
                        onPress={submit}
                        disabled={!draft.point}
                        loading={create.isPending}
                    />
                </>
            )}

            {create.isPending ? (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.overlayLabel}>{t('obstacle.adding')}</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    close: {
        fontSize: 18,
        color: colors.textMuted,
    },
    closeDisabled: {
        opacity: 0.3,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.92)',
    },
    overlayLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    hint: {
        fontSize: 14,
        color: colors.textMuted,
    },
    kinds: {
        gap: 8,
    },
    kind: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    kindPressed: {
        backgroundColor: colors.background,
    },
    kindDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    kindLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    radii: {
        flexDirection: 'row',
        gap: 8,
    },
    radius: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    radiusOn: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    radiusLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    radiusLabelOn: {
        color: colors.textInverse,
    },
    addComment: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primaryPressed,
    },
    comment: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: colors.textPrimary,
    },
    error: {
        fontSize: 13,
        color: colors.danger,
    },
});
