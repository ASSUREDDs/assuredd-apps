import Mapbox, { Camera, LocationPuck, MapView, type MapState } from '@rnmapbox/maps';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MAPBOX_TOKEN } from '@/shared/config/env';
import { colors } from '@/shared/ui/theme/colors';

import { UKRAINE_BOUNDS, UKRAINE_MAX_ZOOM, UKRAINE_MIN_ZOOM, ZOOM_STEP, type LngLat } from '../lib/ukraine';
import { useLocationPermission } from '../model/use-location-permission';

void Mapbox.setAccessToken(MAPBOX_TOKEN);

interface MapboxMapProps {
    center: LngLat;
    zoom: number;
}

export function MapboxMap({ center, zoom }: MapboxMapProps) {
    const isLocationGranted = useLocationPermission();
    const camera = useRef<Camera>(null);
    const currentZoom = useRef(zoom);
    const [canZoomIn, setCanZoomIn] = useState(zoom < UKRAINE_MAX_ZOOM);
    const [canZoomOut, setCanZoomOut] = useState(zoom > UKRAINE_MIN_ZOOM);

    const updateZoomAvailability = useCallback((nextZoom: number) => {
        currentZoom.current = nextZoom;
        setCanZoomIn(nextZoom < UKRAINE_MAX_ZOOM);
        setCanZoomOut(nextZoom > UKRAINE_MIN_ZOOM);
    }, []);

    const handleCameraChanged = useCallback(
        (state: MapState) => updateZoomAvailability(state.properties.zoom),
        [updateZoomAvailability],
    );

    const zoomBy = useCallback(
        (delta: number) => {
            const nextZoom = Math.min(UKRAINE_MAX_ZOOM, Math.max(UKRAINE_MIN_ZOOM, currentZoom.current + delta));
            camera.current?.zoomTo(nextZoom, 300);
            updateZoomAvailability(nextZoom);
        },
        [updateZoomAvailability],
    );

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                styleURL={Mapbox.StyleURL.Street}
                scaleBarEnabled={false}
                logoEnabled
                onCameraChanged={handleCameraChanged}
            >
                <Camera
                    ref={camera}
                    defaultSettings={{ centerCoordinate: center, zoomLevel: zoom }}
                    maxBounds={UKRAINE_BOUNDS}
                    minZoomLevel={UKRAINE_MIN_ZOOM}
                    maxZoomLevel={UKRAINE_MAX_ZOOM}
                />
                {isLocationGranted ? (
                    <LocationPuck
                        puckBearing="heading"
                        puckBearingEnabled
                        pulsing={{ isEnabled: true, color: colors.primary, radius: 'accuracy' }}
                    />
                ) : null}
            </MapView>
            <View style={styles.zoomControls}>
                <Pressable
                    style={styles.zoomButton}
                    disabled={!canZoomIn}
                    onPress={() => zoomBy(ZOOM_STEP)}
                    hitSlop={8}
                >
                    <Text style={[styles.zoomButtonLabel, !canZoomIn && styles.zoomButtonLabelDisabled]}>+</Text>
                </Pressable>
                <View style={styles.zoomControlsDivider} />
                <Pressable
                    style={styles.zoomButton}
                    disabled={!canZoomOut}
                    onPress={() => zoomBy(-ZOOM_STEP)}
                    hitSlop={8}
                >
                    <Text style={[styles.zoomButtonLabel, !canZoomOut && styles.zoomButtonLabelDisabled]}>−</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    zoomControls: {
        position: 'absolute',
        right: 16,
        bottom: 32,
        backgroundColor: colors.surface,
        borderRadius: 8,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    zoomButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomButtonLabel: {
        fontSize: 22,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    zoomButtonLabelDisabled: {
        color: colors.border,
    },
    zoomControlsDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
    },
});
