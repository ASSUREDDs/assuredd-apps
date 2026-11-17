import type { ExpoConfig } from 'expo/config';

type Variant = 'development' | 'staging' | 'production';

const variant = (process.env.APP_VARIANT ?? 'development') as Variant;

const variants = {
    development: {
        name: 'Assuredd Dev',
        bundleId: 'com.assuredd.app.dev',
        apiUrl: 'http://localhost:3550',
    },
    staging: {
        name: 'Assuredd Staging',
        bundleId: 'com.assuredd.app.staging',
        apiUrl: 'https://api-staging.assuredd.com',
    },
    production: {
        name: 'Assuredd',
        bundleId: 'com.assuredd.app',
        apiUrl: 'https://api.assuredd.com',
    },
} as const;

const current = variants[variant];

const config: ExpoConfig = {
    name: current.name,
    slug: 'assuredd-mobile',
    scheme: 'assuredd',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    ios: {
        bundleIdentifier: current.bundleId,
        supportsTablet: false,
    },
    android: {
        package: current.bundleId,
    },
    plugins: [
        ['expo-router', { root: './src/app' }],
        'expo-secure-store',
        'expo-localization',
        '@rnmapbox/maps',
        [
            'expo-location',
            {
                locationWhenInUsePermission:
                    'Allow $(PRODUCT_NAME) to use your location to show where you are on the map and to verify the address you enter during registration.',
                locationAlwaysAndWhenInUsePermission:
                    'Allow $(PRODUCT_NAME) to record your walking route near the delivery address while a delivery is in progress, even when the app is in the background. It is used to measure delivery time and to map courtyards for your company.',
                // Background delivery tracking: adds the "location" background mode on iOS and the
                // background-location permission and a foreground service on Android.
                isIosBackgroundLocationEnabled: true,
                isAndroidBackgroundLocationEnabled: true,
                isAndroidForegroundServiceEnabled: true,
            },
        ],
    ],
    experiments: { typedRoutes: true },
    owner: 'assuredds-team',
    extra: {
        apiUrl: current.apiUrl,
        mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
        variant,
        eas: { projectId: '8e9dbfc1-2f22-4e21-9f36-027a94347fb6' },
    },
};

export default config;