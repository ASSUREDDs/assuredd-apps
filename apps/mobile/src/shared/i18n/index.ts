import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import uk from './locales/uk.json';

export const SUPPORTED_LANGUAGES = ['en', 'uk'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

function isSupportedLanguage(languageCode: string | null): languageCode is SupportedLanguage {
    return SUPPORTED_LANGUAGES.includes(languageCode as SupportedLanguage);
}

function resolveDeviceLanguage(): SupportedLanguage {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Localization = require('expo-localization') as typeof import('expo-localization');
        const match = Localization.getLocales().find((locale) => isSupportedLanguage(locale.languageCode));
        return match ? (match.languageCode as SupportedLanguage) : DEFAULT_LANGUAGE;
    } catch {
        return DEFAULT_LANGUAGE;
    }
}

void i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        uk: { translation: uk },
    },
    lng: resolveDeviceLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
});

export default i18n;
