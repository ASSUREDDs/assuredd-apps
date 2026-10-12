import type { z } from 'zod';
import type { TFunction } from 'i18next';

type Issue = z.core.$ZodIssue;

/**
 * `@app/contracts` schemas are shared with the backend and raise raw, English-only
 * zod messages. This maps the handful of issue shapes our forms actually produce to
 * i18n keys instead, falling back to the raw message for anything unrecognized.
 */
export function translateValidationIssue(issue: Issue, t: TFunction): string {
    const field = issue.path.join('.');

    if (issue.code === 'too_small' && issue.origin === 'string') {
        if (field === 'password') return t('validation.passwordMin', { count: issue.minimum });
        return t('validation.required');
    }

    if (issue.code === 'invalid_format') {
        if (issue.format === 'email') return t('validation.invalidEmail');
        if (field === 'phone.countryCode') return t('validation.invalidCountryCode');
        return t('validation.invalid');
    }

    if (issue.code === 'custom' && field === 'phone') return t('validation.invalidPhoneNumber');

    return issue.message;
}
