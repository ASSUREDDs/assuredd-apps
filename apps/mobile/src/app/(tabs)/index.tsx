import type { AddressSuggestion, ObstacleKind } from '@app/contracts';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OBSTACLE_KINDS } from '@/entities/obstacle/lib/obstacle-style';
import { cancelQueuedAction, dismissRejected, useQueueStatus } from '@/entities/obstacle/model/use-offline-sync';
import { useObstacles, useRemoveObstacle, useVoteObstacle } from '@/entities/obstacle/model/use-obstacles';
import { useRoute } from '@/entities/route/model/use-route';
import { useSessionStore } from '@/entities/session/session.store';
import { mapUnavailableReason } from '@/features/map/lib/mapbox';
import { UKRAINE_BOUNDS, type LngLat as MapLngLat } from '@/features/map/lib/ukraine';
import { AppMap } from '@/features/map/ui/AppMap';
import { useObstacleDraft } from '@/features/obstacle-create/model/draft.store';
import { AddObstacleButton } from '@/features/obstacle-create/ui/AddObstacleButton';
import { DraftPanel } from '@/features/obstacle-create/ui/DraftPanel';
import { ObstacleCard } from '@/features/obstacles/ui/ObstacleCard';
import { ObstacleFilterBar } from '@/features/obstacles/ui/ObstacleFilterBar';
import { PendingObstacleCard } from '@/features/obstacles/ui/PendingObstacleCard';
import { SyncBanner } from '@/features/obstacles/ui/SyncBanner';
import { AddressSearchBar } from '@/features/route/ui/AddressSearchBar';
import { RouteSummary } from '@/features/route/ui/RouteSummary';
import { DeliveryPanel } from '@/features/tracking/ui/DeliveryPanel';
import { isInside, type Bounds, type LngLat } from '@/shared/lib/geo';
import { useDeviceLocation } from '@/shared/lib/use-device-location';
import { colors } from '@/shared/ui/theme/colors';

// The map layers import the native Mapbox module, which Expo Go does not have. They are loaded only
// when the map is available, exactly like the map itself (see AppMap).
/* eslint-disable @typescript-eslint/no-require-imports */
const layers = mapUnavailableReason
    ? null
    : {
          ObstacleLayer: (require('@/features/obstacles/ui/ObstacleLayer') as typeof import('@/features/obstacles/ui/ObstacleLayer'))
              .ObstacleLayer,
          DraftLayer: (require('@/features/obstacle-create/ui/DraftLayer') as typeof import('@/features/obstacle-create/ui/DraftLayer'))
              .DraftLayer,
          RouteLayer: (require('@/features/route/ui/RouteLayer') as typeof import('@/features/route/ui/RouteLayer')).RouteLayer,
      };
/* eslint-enable @typescript-eslint/no-require-imports */

const UKRAINE: Bounds = {
    west: UKRAINE_BOUNDS.sw[0],
    south: UKRAINE_BOUNDS.sw[1],
    east: UKRAINE_BOUNDS.ne[0],
    north: UKRAINE_BOUNDS.ne[1],
};

interface Destination {
    point: LngLat;
    label: string | null;
}

export default function MapScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const user = useSessionStore((state) => state.user);

    const latitude = user?.address.latitude;
    const longitude = user?.address.longitude;
    const profilePoint = useMemo<LngLat | undefined>(
        () => (latitude !== undefined && longitude !== undefined ? [longitude, latitude] : undefined),
        [latitude, longitude],
    );

    // The map only covers Ukraine, so a position outside it (a developer abroad) falls back to the profile address.
    const deviceLocation = useDeviceLocation();
    const courierPosition = useMemo<LngLat | null>(
        () => (deviceLocation && isInside(deviceLocation, UKRAINE) ? deviceLocation : (profilePoint ?? null)),
        [deviceLocation, profilePoint],
    );

    const [bounds, setBounds] = useState<Bounds | null>(null);
    const [kinds, setKinds] = useState<ObstacleKind[]>([...OBSTACLE_KINDS]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [destination, setDestination] = useState<Destination | null>(null);

    const { obstacles, tooLarge } = useObstacles(bounds, kinds);
    const selected = obstacles.find((o) => o.id === selectedId) ?? null;
    const userId = user?.id ?? null;
    const vote = useVoteObstacle(userId);
    const remove = useRemoveObstacle(userId);
    const { waiting, isSyncing, rejectedCount, pendingObstacles } = useQueueStatus(userId);
    const selectedPending = pendingObstacles.find((o) => o.id === selectedId) ?? null;

    const route = useRoute({ from: courierPosition, to: destination?.point ?? null });
    const { checkNow } = route;
    useFocusEffect(
        useCallback(() => {
            void checkNow();
        }, [checkNow]),
    );

    const draftStep = useObstacleDraft((s) => s.step);
    const setDraftPoint = useObstacleDraft((s) => s.setPoint);

    const handleMapPress = useCallback(
        (point: MapLngLat) => {
            if (draftStep === 'place') setDraftPoint(point);
            else setSelectedId(null);
        },
        [draftStep, setDraftPoint],
    );

    // Picking a house on the map: press and hold where it stands.
    const handleMapLongPress = useCallback((point: MapLngLat) => {
        setDestination({ point, label: null });
    }, []);

    const handleSelectAddress = useCallback((address: AddressSuggestion) => {
        setDestination({ point: address.point, label: address.label });
    }, []);

    const clearDestination = useCallback(() => {
        setDestination(null);
        route.clear();
    }, [route.clear]);

    const handleSelectObstacle = useCallback((id: string) => {
        setSelectedId(id);
        vote.reset();
        remove.reset();
    }, []);

    // What the route goes around (or warns about) stays marked for as long as the route is shown.
    const routePins = useMemo(
        () => (route.plan ? [...route.plan.avoided, ...route.plan.warnings] : undefined),
        [route.plan],
    );

    const fitTo = useMemo<LngLat[] | null>(
        () => (route.plan ? route.plan.geometry.coordinates : null),
        [route.plan],
    );

    if (mapUnavailableReason || !layers) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <AppMap center={profilePoint} />
            </View>
        );
    }

    const { ObstacleLayer, DraftLayer, RouteLayer } = layers;
    const isAddingObstacle = draftStep !== 'idle';
    const showCard = !isAddingObstacle && (selected !== null || selectedPending !== null);
    const showFab = !isAddingObstacle && !showCard;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <AppMap
                center={profilePoint}
                onPress={handleMapPress}
                onLongPress={handleMapLongPress}
                onBoundsChange={setBounds}
                fitTo={fitTo}
                fitPadding={{ top: insets.top + 150, bottom: 240 }}
            >
                {route.plan ? <RouteLayer plan={route.plan} /> : null}
                <ObstacleLayer
                    obstacles={obstacles}
                    pins={routePins}
                    pending={pendingObstacles}
                    selectedId={selectedId}
                    onSelect={handleSelectObstacle}
                />
                {isAddingObstacle ? <DraftLayer /> : null}
            </AppMap>

            <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
                <AddressSearchBar
                    near={courierPosition}
                    destinationLabel={destination ? (destination.label ?? t('route.droppedPin')) : null}
                    onSelect={handleSelectAddress}
                    onClear={clearDestination}
                />
                <ObstacleFilterBar selected={kinds} onChange={setKinds} />
                {tooLarge ? <Text style={styles.zoomHint}>{t('obstacle.zoomIn')}</Text> : null}
                {!destination ? <Text style={styles.zoomHint}>{t('route.longPressHint')}</Text> : null}
                <SyncBanner waiting={waiting} isSyncing={isSyncing} rejectedCount={rejectedCount} onDismissRejected={dismissRejected} />
            </View>

            <View style={styles.bottom} pointerEvents="box-none">
                {showFab ? <AddObstacleButton /> : null}

                {isAddingObstacle ? <DraftPanel /> : null}

                {showCard && selectedPending ? (
                    <PendingObstacleCard
                        obstacle={selectedPending}
                        onCancel={() => {
                            cancelQueuedAction(selectedPending.id);
                            setSelectedId(null);
                        }}
                        onClose={() => setSelectedId(null)}
                    />
                ) : null}

                {showCard && selected ? (
                    <ObstacleCard
                        obstacle={selected}
                        canRemove={selected.createdBy === user?.id}
                        isBusy={vote.isPending || remove.isPending}
                        hasError={vote.isError || remove.isError}
                        onVote={(value) => vote.mutate({ id: selected.id, vote: value })}
                        onRemove={() =>
                            remove.mutate(selected.id, {
                                onSuccess: () => setSelectedId(null),
                            })
                        }
                        onClose={() => setSelectedId(null)}
                    />
                ) : null}

                {!isAddingObstacle && !showCard ? (
                    <DeliveryPanel plan={route.plan} label={destination?.label ?? null} userId={userId} />
                ) : null}

                {!isAddingObstacle && !showCard ? (
                    <RouteSummary
                        status={route.status}
                        plan={route.plan}
                        error={route.error}
                        notice={route.notice}
                        isUpdating={route.isUpdating}
                        onDismissNotice={route.dismissNotice}
                        onClear={clearDestination}
                    />
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    top: {
        position: 'absolute',
        left: 12,
        right: 12,
        gap: 8,
    },
    zoomHint: {
        alignSelf: 'flex-start',
        fontSize: 12,
        color: colors.textPrimary,
        backgroundColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        overflow: 'hidden',
    },
    bottom: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 16,
        gap: 10,
    },
});
