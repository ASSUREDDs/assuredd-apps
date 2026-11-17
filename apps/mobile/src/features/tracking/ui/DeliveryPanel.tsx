import type { RoutePlan } from '@app/contracts';
import { TRACK_RADIUS_M } from '@app/contracts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/shared/ui/Button';
import { colors } from '@/shared/ui/theme/colors';

import { lastMetersSeconds } from '../lib/tracking-logic';
import { cancelDelivery, dismissDelivery, markDoorReached, startDelivery } from '../model/tracking-controller';
import { giveTrackingConsent, hasTrackingConsent } from '../model/tracking-consent';
import { useCurrentDelivery } from '../model/use-tracking';

interface DeliveryPanelProps {
    /** The route on screen. A delivery can be started when there is one. */
    plan: RoutePlan | null;
    /** What the courier typed or picked, saved with the visit for reports. */
    label: string | null;
    userId: string | null;
}

function confirm(title: string, message: string, ok: string, cancel: string): Promise<boolean> {
    return new Promise((resolve) => {
        Alert.alert(
            title,
            message,
            [
                { text: cancel, style: 'cancel', onPress: () => resolve(false) },
                { text: ok, onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
        );
    });
}

/** Starting a delivery, tracking it near the address, and saying "I'm at the door". */
export function DeliveryPanel({ plan, label, userId }: DeliveryPanelProps) {
    const { t } = useTranslation();
    const { visit, unsentPoints } = useCurrentDelivery();
    const [isStarting, setIsStarting] = useState(false);

    async function handleStart() {
        if (!plan || !userId) return;

        if (!(await hasTrackingConsent())) {
            const agreed = await confirm(t('tracking.consentTitle'), t('tracking.consentBody', { meters: TRACK_RADIUS_M }), t('tracking.consentAgree'), t('tracking.cancel'));
            if (!agreed) return;
            await giveTrackingConsent();
        }

        setIsStarting(true);
        const result = await startDelivery({ userId, destination: plan.destination.point, label });
        setIsStarting(false);

        if (!result.ok) {
            Alert.alert(t('tracking.startFailedTitle'), t(`tracking.errors.${result.reason}`));
            return;
        }
        if (!result.backgroundGranted) {
            Alert.alert(t('tracking.foregroundOnlyTitle'), t('tracking.foregroundOnlyBody'), [
                { text: t('tracking.openSettings'), onPress: () => void Linking.openSettings() },
                { text: t('tracking.ok') },
            ]);
        }
    }

    async function handleCancel() {
        const sure = await confirm(t('tracking.cancelTitle'), t('tracking.cancelBody'), t('tracking.cancelYes'), t('tracking.cancelNo'));
        if (!sure) return;
        await cancelDelivery();
        await dismissDelivery();
    }

    if (!visit) {
        if (!plan) return null;
        return <Button label={t('tracking.start')} onPress={() => void handleStart()} loading={isStarting} />;
    }

    if (visit.status === 'active') {
        return (
            <View style={styles.card}>
                <Text style={styles.title}>{t('tracking.inProgress')}</Text>
                <Text style={styles.muted} numberOfLines={1}>
                    {visit.label ?? t('route.droppedPin')}
                </Text>
                <Text style={styles.status}>
                    {visit.enteredAt ? t('tracking.recording') : t('tracking.waitingForZone', { meters: TRACK_RADIUS_M })}
                </Text>
                {unsentPoints > 0 ? <Text style={styles.muted}>{t('tracking.unsent', { count: unsentPoints })}</Text> : null}

                <Button label={t('tracking.atDoor')} onPress={() => void markDoorReached()} />
                <Pressable onPress={() => void handleCancel()} hitSlop={8}>
                    <Text style={styles.cancel}>{t('tracking.cancelDelivery')}</Text>
                </Pressable>
            </View>
        );
    }

    const seconds = lastMetersSeconds(visit.enteredAt, visit.doorAt);
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{visit.status === 'completed' ? t('tracking.delivered') : t('tracking.ended')}</Text>
            {visit.status === 'completed' && seconds !== null ? (
                <Text style={styles.status}>
                    {t('tracking.lastMeters', { meters: TRACK_RADIUS_M, minutes: Math.floor(seconds / 60), seconds: seconds % 60 })}
                </Text>
            ) : null}
            {unsentPoints > 0 ? <Text style={styles.muted}>{t('tracking.unsent', { count: unsentPoints })}</Text> : null}
            <Button label={t('tracking.done')} variant="secondary" onPress={() => void dismissDelivery()} />
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
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    status: {
        fontSize: 15,
        color: colors.textPrimary,
    },
    muted: {
        fontSize: 13,
        color: colors.textMuted,
    },
    cancel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.danger,
        textAlign: 'center',
        marginTop: 2,
    },
});
