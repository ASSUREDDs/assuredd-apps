import { IS_EXPO_GO, MAPBOX_TOKEN } from '@/shared/config/env';

export type MapUnavailableReason = 'expo-go' | 'no-token';

function resolveUnavailableReason(): MapUnavailableReason | null {
    // Expo Go ships a fixed set of native modules, and @rnmapbox/maps is not one of
    // them — see RNMBXModule.ts, which throws as soon as the module is imported.
    if (IS_EXPO_GO) return 'expo-go';
    if (!MAPBOX_TOKEN) return 'no-token';
    return null;
}

export const mapUnavailableReason = resolveUnavailableReason();
