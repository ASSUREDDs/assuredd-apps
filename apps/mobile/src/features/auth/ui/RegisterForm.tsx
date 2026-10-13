import { GenderSchema, RegisterRequestSchema, type Gender } from '@app/contracts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/shared/api/http';
import type { AddressSuggestion } from '@/shared/lib/address-suggest';
import { geocodeAddress, type Coordinates } from '@/shared/lib/geocode';
import { translateValidationIssue } from '@/shared/lib/validation-messages';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { TextField } from '@/shared/ui/TextField';
import { colors } from '@/shared/ui/theme/colors';

import { getAuthErrorKey } from '../lib/error-messages';
import { useRegister } from '../model/use-register';
import { StreetField } from './StreetField';

const GENDER_OPTIONS = GenderSchema.options;

interface FormValues {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    countryCode: string;
    phoneNumber: string;
    gender: Gender;
    city: string;
    street: string;
    houseNumber: string;
}

const initialValues: FormValues = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    countryCode: '+380',
    phoneNumber: '',
    gender: 'male',
    city: '',
    street: '',
    houseNumber: '',
};

export function RegisterForm() {
    const [values, setValues] = useState<FormValues>(initialValues);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
    const [geocodeError, setGeocodeError] = useState<string>();
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [suggestedCoordinates, setSuggestedCoordinates] = useState<Coordinates>();
    const register = useRegister();
    const { t } = useTranslation();

    function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
        setValues((prev) => ({ ...prev, [key]: value }));
    }

    function handleStreetSelect(suggestion: AddressSuggestion) {
        setValues((prev) => ({
            ...prev,
            street: suggestion.street,
            city: suggestion.city || prev.city,
        }));
        setSuggestedCoordinates({ latitude: suggestion.latitude, longitude: suggestion.longitude });
    }

    async function handleSubmit() {
        setFieldErrors({});
        setGeocodeError(undefined);
        setIsGeocoding(true);

        const coordinates =
            (await geocodeAddress(`${values.street} ${values.houseNumber}, ${values.city}`)) ?? suggestedCoordinates;

        setIsGeocoding(false);

        if (!coordinates) {
            setGeocodeError(t('auth.register.geocodeError'));
            return;
        }

        const parsed = RegisterRequestSchema.safeParse({
            email: values.email,
            password: values.password,
            firstName: values.firstName,
            lastName: values.lastName,
            phone: { countryCode: values.countryCode, number: values.phoneNumber },
            gender: values.gender,
            address: {
                city: values.city,
                street: values.street,
                houseNumber: values.houseNumber,
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
            },
        });

        if (!parsed.success) {
            const errors: Partial<Record<string, string>> = {};
            for (const issue of parsed.error.issues) {
                errors[issue.path.join('.')] = translateValidationIssue(issue, t);
            }
            setFieldErrors(errors);
            return;
        }

        register.mutate(parsed.data);
    }

    const submitError = register.isError
        ? t(getAuthErrorKey(register.error instanceof ApiError ? register.error.code : undefined))
        : undefined;

    return (
        <View style={styles.container}>
            <TextField
                label={t('auth.register.firstNameLabel')}
                value={values.firstName}
                onChangeText={(v) => setField('firstName', v)}
                error={fieldErrors.firstName}
            />
            <TextField
                label={t('auth.register.lastNameLabel')}
                value={values.lastName}
                onChangeText={(v) => setField('lastName', v)}
                error={fieldErrors.lastName}
            />
            <TextField
                label={t('auth.register.emailLabel')}
                value={values.email}
                onChangeText={(v) => setField('email', v)}
                autoCapitalize="none"
                keyboardType="email-address"
                error={fieldErrors.email}
            />
            <TextField
                label={t('auth.register.passwordLabel')}
                value={values.password}
                onChangeText={(v) => setField('password', v)}
                secureTextEntry
                error={fieldErrors.password}
            />

            <View style={styles.row}>
                <View style={styles.countryCode}>
                    <TextField
                        label={t('auth.register.countryCodeLabel')}
                        value={values.countryCode}
                        onChangeText={(v) => setField('countryCode', v)}
                        error={fieldErrors['phone.countryCode']}
                    />
                </View>
                <View style={styles.phoneNumber}>
                    <TextField
                        label={t('auth.register.phoneNumberLabel')}
                        value={values.phoneNumber}
                        onChangeText={(v) => setField('phoneNumber', v)}
                        keyboardType="phone-pad"
                        error={fieldErrors['phone.number'] ?? fieldErrors.phone}
                    />
                </View>
            </View>

            <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((option) => (
                    <Pressable
                        key={option}
                        onPress={() => setField('gender', option)}
                        style={[styles.genderChip, values.gender === option && styles.genderChipSelected]}
                    >
                        <Text style={[styles.genderLabel, values.gender === option && styles.genderLabelSelected]}>
                            {t(`auth.genders.${option}`)}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <TextField
                label={t('auth.register.cityLabel')}
                value={values.city}
                onChangeText={(v) => setField('city', v)}
                error={fieldErrors['address.city']}
            />

            <StreetField
                value={values.street}
                city={values.city}
                onChangeText={(v) => setField('street', v)}
                onSelect={handleStreetSelect}
                error={fieldErrors['address.street']}
            />

            <TextField
                label={t('auth.register.houseNumberLabel')}
                value={values.houseNumber}
                onChangeText={(v) => setField('houseNumber', v)}
                error={fieldErrors['address.houseNumber']}
            />

            <FormError message={geocodeError ?? submitError} />
            <Button
                label={t('auth.register.submit')}
                onPress={() => void handleSubmit()}
                loading={isGeocoding || register.isPending}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    countryCode: {
        width: 90,
    },
    phoneNumber: {
        flex: 1,
    },
    genderRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    genderChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    genderChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    genderLabel: {
        color: colors.textPrimary,
        fontSize: 14,
    },
    genderLabelSelected: {
        color: colors.textInverse,
        fontWeight: '600',
    },
});
