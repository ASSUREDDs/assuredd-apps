import Mapbox, { Camera, CircleLayer, LocationPuck, MapView, ShapeSource, type MapState } from '@rnmapbox/maps';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MAPBOX_TOKEN } from '@/shared/config/env';
import type { Bounds } from '@/shared/lib/geo';
import { colors } from '@/shared/ui/theme/colors';

import { UKRAINE_BOUNDS, UKRAINE_MAX_ZOOM, UKRAINE_MIN_ZOOM, ZOOM_STEP, type LngLat } from '../lib/ukraine';
import { useLocationPermission } from '../model/use-location-permission';

void Mapbox.setAccessToken(MAPBOX_TOKEN);

const LOCATION_PULSING = { isEnabled: true, color: colors.primary, radius: 'accuracy' } as const;

const MARKER_STYLE = {
    circleRadius: 9,
    circleColor: colors.primary,
    circleStrokeWidth: 3,
    circleStrokeColor: '#ffffff',
} as const;

interface MapboxMapProps {
    center: LngLat;
    zoom: number;
    marker?: LngLat;
    /** Layers (obstacles, route, ...) drawn on the map by the screen that owns this map. */
    children?: ReactNode;
    onPress?: (point: LngLat) => void;
    onLongPress?: (point: LngLat) => void;
    /** Called when the camera stops moving, with the visible area. */
    onBoundsChange?: (bounds: Bounds) => void;
    /** When set, the camera frames all of these points. */
    fitTo?: LngLat[] | null;
    /** Space the camera keeps free around `fitTo`, for overlays above and below the map. */
    fitPadding?: { top: number; bottom: number };
}

const FIT_SIDE_PADDING = 48;
const FIT_DURATION_MS = 600;

export function MapboxMap({ center, zoom, marker, children, onPress, onLongPress, onBoundsChange, fitTo, fitPadding }: MapboxMapProps) {
    const isLocationGranted = useLocationPermission();
    const camera = useRef<Camera>(null);
    const currentZoom = useRef(zoom);
    // Stable references: new objects on every render make native views re-apply props.
    const cameraSettings = useMemo(() => ({ centerCoordinate: center, zoomLevel: zoom }), [center, zoom]);
    const markerShape = useMemo(
        () =>
            marker
                ? ({
                      type: 'Feature',
                      properties: {},
                      geometry: { type: 'Point', coordinates: marker },
                  } as const)
                : null,
        [marker],
    );
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

    const handlePress = useCallback(
        (feature: { geometry: { coordinates: number[] } }) => onPress?.(feature.geometry.coordinates as LngLat),
        [onPress],
    );
    const handleLongPress = useCallback(
        (feature: { geometry: { coordinates: number[] } }) => onLongPress?.(feature.geometry.coordinates as LngLat),
        [onLongPress],
    );
    const handleIdle = useCallback(
        (state: MapState) => {
            const { ne, sw } = state.properties.bounds;
            onBoundsChange?.({ west: sw[0], south: sw[1], east: ne[0], north: ne[1] });
        },
        [onBoundsChange],
    );

    // A new array with the same points must not move the camera again.
    const fitKey = fitTo && fitTo.length > 0 ? fitTo.map((p) => `${p[0]},${p[1]}`).join(';') : null;
    const fitTop = fitPadding?.top ?? FIT_SIDE_PADDING;
    const fitBottom = fitPadding?.bottom ?? FIT_SIDE_PADDING;
    useEffect(() => {
        if (!fitTo || fitTo.length === 0) return;
        const lngs = fitTo.map((p) => p[0]);
        const lats = fitTo.map((p) => p[1]);
        camera.current?.fitBounds(
            [Math.max(...lngs), Math.max(...lats)],
            [Math.min(...lngs), Math.min(...lats)],
            [fitTop, FIT_SIDE_PADDING, fitBottom, FIT_SIDE_PADDING],
            FIT_DURATION_MS,
        );
        // `fitKey` stands for `fitTo`.
    }, [fitKey, fitTop, fitBottom]);

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
                onPress={handlePress}
                onLongPress={handleLongPress}
                onMapIdle={handleIdle}
            >
                <Camera
                    ref={camera}
                    defaultSettings={cameraSettings}
                    maxBounds={UKRAINE_BOUNDS}
                    minZoomLevel={UKRAINE_MIN_ZOOM}
                    maxZoomLevel={UKRAINE_MAX_ZOOM}
                />
                {markerShape ? (
                    <ShapeSource id="user-address" shape={markerShape}>
                        <CircleLayer id="user-address-circle" style={MARKER_STYLE} />
                    </ShapeSource>
                ) : null}
                {children}
                {isLocationGranted ? (
                    <LocationPuck
                        puckBearing="heading"
                        puckBearingEnabled
                        pulsing={LOCATION_PULSING}
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
        top: '40%',
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
