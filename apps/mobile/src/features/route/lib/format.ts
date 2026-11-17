import type { TFunction } from 'i18next';

export function formatDistance(meters: number, t: TFunction): string {
    if (meters < 1000) return t('route.distanceM', { count: Math.round(meters) });
    return t('route.distanceKm', { value: (meters / 1000).toFixed(1) });
}

export function formatDuration(seconds: number, t: TFunction): string {
    return t('route.durationMin', { count: Math.max(1, Math.round(seconds / 60)) });
}
