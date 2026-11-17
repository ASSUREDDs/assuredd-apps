import type { RoutePlan } from '@app/contracts';
import { CircleLayer, LineLayer, ShapeSource } from '@rnmapbox/maps';
import { useMemo } from 'react';

import { colors } from '@/shared/ui/theme/colors';

const CASING_STYLE = { lineColor: '#ffffff', lineWidth: 8, lineCap: 'round', lineJoin: 'round' } as const;
const LINE_STYLE = { lineColor: colors.primaryPressed, lineWidth: 5, lineCap: 'round', lineJoin: 'round' } as const;
const DESTINATION_STYLE = {
    circleRadius: 9,
    circleColor: colors.primaryPressed,
    circleStrokeWidth: 3,
    circleStrokeColor: '#ffffff',
} as const;

interface RouteLayerProps {
    plan: RoutePlan;
}

/** The walking route and its destination (the entrance, when the house has a known one). Must be rendered inside a map. */
export function RouteLayer({ plan }: RouteLayerProps) {
    const line = useMemo(
        () => ({ type: 'Feature' as const, properties: {}, geometry: plan.geometry }),
        [plan.geometry],
    );
    const destination = useMemo(
        () => ({
            type: 'Feature' as const,
            properties: {},
            geometry: { type: 'Point' as const, coordinates: plan.destination.point },
        }),
        [plan.destination.point],
    );

    return (
        <>
            <ShapeSource id="route-line" shape={line}>
                <LineLayer id="route-line-casing" style={CASING_STYLE} />
                <LineLayer id="route-line-main" style={LINE_STYLE} />
            </ShapeSource>
            <ShapeSource id="route-destination" shape={destination}>
                <CircleLayer id="route-destination-circle" style={DESTINATION_STYLE} />
            </ShapeSource>
        </>
    );
}
