import { CircleLayer, FillLayer, LineLayer, ShapeSource } from '@rnmapbox/maps';
import { useMemo } from 'react';

import { OBSTACLE_COLORS } from '@/entities/obstacle/lib/obstacle-style';
import { circleRing } from '@/shared/lib/geo';
import { colors } from '@/shared/ui/theme/colors';

import { useObstacleDraft } from '../model/draft.store';

/** Previews the obstacle being added: the zone and the chosen point. Must be rendered inside a map. */
export function DraftLayer() {
    const point = useObstacleDraft((s) => s.point);
    const radiusM = useObstacleDraft((s) => s.radiusM);
    const kind = useObstacleDraft((s) => s.kind);

    const zone = useMemo(
        () =>
            point
                ? {
                      type: 'Feature' as const,
                      properties: {},
                      geometry: { type: 'Polygon' as const, coordinates: [circleRing(point, radiusM)] },
                  }
                : null,
        [point, radiusM],
    );

    const marker = useMemo(
        () =>
            point
                ? { type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: point } }
                : null,
        [point],
    );

    const color = kind ? OBSTACLE_COLORS[kind] : colors.primary;
    const fillStyle = useMemo(() => ({ fillColor: color, fillOpacity: 0.3 }), [color]);
    const lineStyle = useMemo(() => ({ lineColor: color, lineWidth: 2, lineDasharray: [2, 2] }), [color]);
    const markerStyle = useMemo(
        () => ({ circleRadius: 8, circleColor: color, circleStrokeWidth: 3, circleStrokeColor: '#ffffff' }),
        [color],
    );

    if (!zone || !marker) return null;

    return (
        <>
            <ShapeSource id="draft-zone" shape={zone}>
                <FillLayer id="draft-zone-fill" style={fillStyle} />
                <LineLayer id="draft-zone-line" style={lineStyle} />
            </ShapeSource>
            <ShapeSource id="draft-point" shape={marker}>
                <CircleLayer id="draft-point-circle" style={markerStyle} />
            </ShapeSource>
        </>
    );
}
