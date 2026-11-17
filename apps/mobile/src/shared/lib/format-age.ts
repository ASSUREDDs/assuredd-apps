import type { TFunction } from 'i18next';

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function formatAge(iso: string, t: TFunction, now: Date = new Date()): string {
    const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));

    if (minutes < 1) return t('time.justNow');
    if (minutes < 60) return t('time.minutesAgo', { count: minutes });
    if (minutes < 60 * 24) return t('time.hoursAgo', { count: Math.floor(minutes / 60) });
    return t('time.daysAgo', { count: Math.floor(minutes / (60 * 24)) });
}
