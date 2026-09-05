import type { ExpoConfig } from 'expo/config';

type Variant = 'development' | 'staging' | 'production';

const variant = (process.env.APP_VARIANT ?? 'development') as Variant;

const variants = {
    development: {
        name: 'Assuredd Dev',
        bundleId: 'com.assuredd.app.dev',
        apiUrl: 'http://localhost:3000',
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
    plugins: [['expo-router', { root: './src/app' }]],
    experiments: { typedRoutes: true },
    extra: {
        apiUrl: current.apiUrl,
        variant,
        eas: { projectId: 'подставится после eas init' },
    },
};

export default config;