import type { Obstacle } from '@app/contracts';
import { CircleLayer, FillLayer, LineLayer, ShapeSource } from '@rnmapbox/maps';
import { useCallback, useMemo } from 'react';

import { OBSTACLE_COLORS } from '@/entities/obstacle/lib/obstacle-style';
import type { PendingObstacle } from '@/entities/obstacle/lib/pending-obstacle';
import { colors } from '@/shared/ui/theme/colors';

const COLOR_BY_KIND = [
    'match',
    ['get', 'kind'],
    'closed_arch',
    OBSTACLE_COLORS.closed_arch,
    'incident',
    OBSTACLE_COLORS.incident,
    '#888888',
] as const;

// Obstacles added without a connection ("pending") are drawn faded, so they read as "not sent yet".
const ZONE_FILL_STYLE = { fillColor: COLOR_BY_KIND, fillOpacity: ['case', ['get', 'pending'], 0.1, 0.22] } as const;
const ZONE_LINE_STYLE = { lineColor: COLOR_BY_KIND, lineWidth: 2, lineOpacity: ['case', ['get', 'pending'], 0.45, 0.8] } as const;

interface PressEvent {
    features: { properties?: Record<string, unknown> | null }[];
}

export interface ObstaclePin {
    id: string;
    kind: Obstacle['kind'];
    center: Obstacle['center'];
}

interface ObstacleLayerProps {
    obstacles: Obstacle[];
    /** Obstacles to mark even if the search did not return them (the route goes around these). */
    pins?: ObstaclePin[];
    /** Added offline and not yet sent. */
    pending?: PendingObstacle[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

/** Zones (the area to avoid) with a tappable marker on each. Must be rendered inside a map. */
export function ObstacleLayer({ obstacles, pins, pending, selectedId, onSelect }: ObstacleLayerProps) {
    const zones = useMemo(
        () => ({
            type: 'FeatureCollection' as const,
            features: obstacles.map((o) => ({
                type: 'Feature' as const,
                id: o.id,
                properties: { id: o.id, kind: o.kind, pending: false },
                geometry: o.geometry,
            })).concat(
                (pending ?? []).map((o) => ({
                    type: 'Feature' as const,
                    id: o.id,
                    properties: { id: o.id, kind: o.kind, pending: true },
                    geometry: { type: 'Polygon' as const, coordinates: [o.ring] },
                })),
            ),
        }),
        [obstacles, pending],
    );

    const markers = useMemo(
        () => ({
            type: 'FeatureCollection' as const,
            features: [
                ...[...obstacles, ...(pins ?? []).filter((pin) => !obstacles.some((o) => o.id === pin.id))].map((o) => ({
                    type: 'Feature' as const,
                    id: o.id,
                    properties: { id: o.id, kind: o.kind, pending: false },
                    geometry: { type: 'Point' as const, coordinates: o.center },
                })),
                ...(pending ?? []).map((o) => ({
                    type: 'Feature' as const,
                    id: o.id,
                    properties: { id: o.id, kind: o.kind, pending: true },
                    geometry: { type: 'Point' as const, coordinates: o.center },
                })),
            ],
        }),
        [obstacles, pins, pending],
    );

    const markerStyle = useMemo(
        () => ({
            circleRadius: ['case', ['==', ['get', 'id'], selectedId ?? ''], 15, 11] as const,
            circleColor: COLOR_BY_KIND,
            circleOpacity: ['case', ['get', 'pending'], 0.55, 1] as const,
            circleStrokeWidth: 3,
            circleStrokeColor: ['case', ['get', 'pending'], colors.textMuted, '#ffffff'] as const,
        }),
        [selectedId],
    );

    const handlePress = useCallback(
        (event: PressEvent) => {
            const id = event.features[0]?.properties?.id;
            if (typeof id === 'string') onSelect(id);
        },
        [onSelect],
    );

    return (
        <>
            <ShapeSource id="obstacle-zones" shape={zones}>
                <FillLayer id="obstacle-zones-fill" style={ZONE_FILL_STYLE} />
                <LineLayer id="obstacle-zones-line" style={ZONE_LINE_STYLE} />
            </ShapeSource>
            <ShapeSource id="obstacle-markers" shape={markers} onPress={handlePress} hitbox={{ width: 44, height: 44 }}>
                <CircleLayer id="obstacle-markers-circle" style={markerStyle} />
            </ShapeSource>
        </>
    );
}
