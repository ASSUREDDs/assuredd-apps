import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = { apiUrl: string; variant: string };

const extra = Constants.expoConfig?.extra as Extra | undefined;

if (!extra?.apiUrl) {
    throw new Error('apiUrl не задан в app.config.ts → extra');
}

function resolveDevHost(url: string): string {
    if (Platform.OS === 'android') {
        return url.replace('localhost', '10.0.2.2');
    }
    return url;
}

export const API_URL = resolveDevHost(extra.apiUrl);
export const APP_VARIANT = extra.variant;
export const IS_DEV = extra.variant === 'development';