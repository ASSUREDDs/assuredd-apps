import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/shared/ui/theme/colors';

import { mapUnavailableReason, type MapUnavailableReason } from '../lib/mapbox';
import { CITY_ZOOM, UKRAINE_CENTER, UKRAINE_ZOOM, type LngLat } from '../lib/ukraine';

const MESSAGES: Record<MapUnavailableReason, string> = {
    'expo-go': 'Expo Go cannot load Mapbox. Open the app in a development build to see the map.',
    'no-token': 'Set EXPO_PUBLIC_MAPBOX_TOKEN in apps/mobile/.env and rebuild to load the map.',
};

interface UkraineMapProps {
    /** Where to open the camera; falls back to the whole country. */
    center?: LngLat;
}

export function UkraineMap({ center }: UkraineMapProps) {
    if (mapUnavailableReason) {
        return (
            <View style={styles.placeholder}>
                <Text style={styles.placeholderTitle}>Map is unavailable</Text>
                <Text style={styles.placeholderText}>{MESSAGES[mapUnavailableReason]}</Text>
            </View>
        );
    }

    // Required lazily: @rnmapbox/maps throws while being imported when its native code
    // is missing, so the module must stay untouched unless the map can actually render.
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
