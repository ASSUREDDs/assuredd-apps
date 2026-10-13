import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export function useLocationPermission(): boolean {
    const [isGranted, setIsGranted] = useState(false);

    useEffect(() => {
        let isActive = true;

        void (async () => {
            try {
                const { granted } = await Location.requestForegroundPermissionsAsync();
                if (isActive) setIsGranted(granted);
            } catch {
                if (isActive) setIsGranted(false);
            }
        })();

        return () => {
            isActive = false;
        };
    }, []);

    return isGranted;
}
