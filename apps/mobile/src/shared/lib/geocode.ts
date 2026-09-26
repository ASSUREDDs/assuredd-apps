import * as Location from 'expo-location';

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const results = await Location.geocodeAsync(address);
    const [first] = results;

    return first ? { latitude: first.latitude, longitude: first.longitude } : null;
}
