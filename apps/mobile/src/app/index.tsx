import { Text, View } from 'react-native';
import { API_URL, APP_VARIANT } from '@/shared/config/env';

export default function Home() {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{APP_VARIANT}</Text>
            <Text>{API_URL}</Text>
        </View>
    );
}