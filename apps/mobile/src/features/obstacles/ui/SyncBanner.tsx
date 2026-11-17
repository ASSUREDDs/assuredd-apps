import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/shared/ui/theme/colors';

interface SyncBannerProps {
    /** Changes saved on the phone that the server has not received yet. */
    waiting: number;
    isSyncing: boolean;
    /** Changes the server refused when they were finally sent. */
    rejectedCount: number;
    onDismissRejected: () => void;
}

export function SyncBanner({ waiting, isSyncing, rejectedCount, onDismissRejected }: SyncBannerProps) {
    const { t } = useTranslation();

    if (rejectedCount > 0) {
        return (
            <Pressable onPress={onDismissRejected} style={[styles.banner, styles.rejected]}>
                <Text style={styles.rejectedText}>{t('sync.rejected', { count: rejectedCount })}</Text>
                <Text style={styles.rejectedText}>✕</Text>
            </Pressable>
        );
    }

    if (waiting === 0) return null;

    return (
        <Pressable style={styles.banner}>
            {isSyncing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.icon}>⏳</Text>}
            <Text style={styles.text}>{isSyncing ? t('sync.sending') : t('sync.waiting', { count: waiting })}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    rejected: {
        backgroundColor: colors.danger,
    },
    icon: {
        fontSize: 14,
    },
    text: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    rejectedText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textInverse,
    },
});
