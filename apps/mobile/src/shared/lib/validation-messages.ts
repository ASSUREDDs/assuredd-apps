import type { z } from 'zod';
import type { TFunction } from 'i18next';

type Issue = z.core.$ZodIssue;

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
