import { LoginRequestSchema } from '@app/contracts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ApiError } from '@/shared/api/http';
import { translateValidationIssue } from '@/shared/lib/validation-messages';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { TextField } from '@/shared/ui/TextField';

import { getAuthErrorKey } from '../lib/error-messages';
import { useLogin } from '../model/use-login';

interface FieldErrors {
    email?: string;
    password?: string;
}

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const login = useLogin();
    const { t } = useTranslation();

    function handleSubmit() {
        const parsed = LoginRequestSchema.safeParse({ email, password });
        if (!parsed.success) {
            const errors: FieldErrors = {};
            for (const issue of parsed.error.issues) {
                const field = issue.path[0];
                if (field === 'email' || field === 'password') errors[field] = translateValidationIssue(issue, t);
            }
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        login.mutate(parsed.data);
    }

    const submitError = login.isError
        ? t(getAuthErrorKey(login.error instanceof ApiError ? login.error.code : undefined))
        : undefined;

    return (
        <View style={{ gap: 16 }}>
            <TextField
                label={t('auth.login.emailLabel')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                error={fieldErrors.email}
            />
            <TextField
                label={t('auth.login.passwordLabel')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                error={fieldErrors.password}
            />
            <FormError message={submitError} />
            <Button label={t('auth.login.submit')} onPress={handleSubmit} loading={login.isPending} />
        </View>
    );
}
