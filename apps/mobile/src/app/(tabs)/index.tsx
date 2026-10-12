import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { useSessionStore } from '@/entities/session/session.store';
import { UkraineMap } from '@/features/map/ui/UkraineMap';
import type { LngLat } from '@/features/map/lib/ukraine';

export default function MapScreen() {
    const address = useSessionStore((state) => state.user?.address);
    const center: LngLat | undefined = address ? [address.longitude, address.latitude] : undefined;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <UkraineMap center={center} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
