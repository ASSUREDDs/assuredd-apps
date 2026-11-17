import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { LngLat } from './geo';

/** The device position while the screen is mounted, or null when unavailable or not permitted. */
export function useDeviceLocation(): LngLat | null {
    const [position, setPosition] = useState<LngLat | null>(null);

    useEffect(() => {
        let subscription: Location.LocationSubscription | undefined;
        let isActive = true;

        void (async () => {
            try {
                const { granted } = await Location.requestForegroundPermissionsAsync();
                if (!granted || !isActive) return;

                subscription = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 10_000 },
                    (location) => {
                        if (isActive) setPosition([location.coords.longitude, location.coords.latitude]);
                    },
                );
                if (!isActive) subscription.remove();
            } catch {
                // No location: the screen falls back to the profile address.
            }
        })();

        return () => {
            isActive = false;
            subscription?.remove();
        };
    }, []);

    return position;
}
