import Constants from 'expo-constants';

type Extra = { apiUrl: string; variant: string };

const extra = Constants.expoConfig?.extra as Extra | undefined;

if (!extra?.apiUrl) {
    throw new Error('apiUrl не задан в app.config.ts → extra');
}

function resolveDevHost(url: string): string {
    const hostUri = Constants.expoConfig?.hostUri;
    if (!hostUri) return url;

    const host = hostUri.split(':')[0];
    return url.replace('localhost', host);
}

export const API_URL = resolveDevHost(extra.apiUrl);
export const APP_VARIANT = extra.variant;
export const IS_DEV = extra.variant === 'development';