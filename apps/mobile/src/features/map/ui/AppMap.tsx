import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/shared/ui/theme/colors';

import { mapUnavailableReason, type MapUnavailableReason } from '../lib/mapbox';
import { CITY_ZOOM, UKRAINE_CENTER, UKRAINE_ZOOM, type LngLat } from '../lib/ukraine';

const MESSAGE_KEYS: Record<MapUnavailableReason, string> = {
    'expo-go': 'map.unavailableExpoGo',
    'no-token': 'map.unavailableNoToken',
};

interface AppMapProps {
    center?: LngLat;
}

export function AppMap({ center }: AppMapProps) {
    const { t } = useTranslation();

    if (mapUnavailableReason) {
        return (
            <View style={styles.placeholder}>
                <Text style={styles.placeholderTitle}>{t('map.unavailableTitle')}</Text>
                <Text style={styles.placeholderText}>{t(MESSAGE_KEYS[mapUnavailableReason])}</Text>
            </View>
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MapboxMap } = require('./MapboxMap') as typeof import('./MapboxMap');

    return <MapboxMap center={center ?? UKRAINE_CENTER} zoom={center ? CITY_ZOOM : UKRAINE_ZOOM} />;
}

const styles = StyleSheet.create({
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 24,
        backgroundColor: colors.background,
    },
    placeholderTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    placeholderText: {
        fontSize: 14,
        textAlign: 'center',
        color: colors.textMuted,
    },
});
