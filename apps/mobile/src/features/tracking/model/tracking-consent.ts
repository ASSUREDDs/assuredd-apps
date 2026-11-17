import { fileStorage } from '@/shared/lib/file-storage';

const NAME = 'tracking-consent';

/** The courier agreed to have their route near delivery addresses recorded. Asked once, before the first delivery. */
export async function hasTrackingConsent(): Promise<boolean> {
    return (await fileStorage.getItem(NAME)) !== null;
}

export async function giveTrackingConsent(): Promise<void> {
    await fileStorage.setItem(NAME, JSON.stringify({ agreedAt: new Date().toISOString() }));
}
