import { IS_EXPO_GO, MAPBOX_TOKEN } from '@/shared/config/env';

export type MapUnavailableReason = 'expo-go' | 'no-token';

function resolveUnavailableReason(): MapUnavailableReason | null {
    if (IS_EXPO_GO) return 'expo-go';
    if (!MAPBOX_TOKEN) return 'no-token';
    return null;
}

export const mapUnavailableReason = resolveUnavailableReason();
