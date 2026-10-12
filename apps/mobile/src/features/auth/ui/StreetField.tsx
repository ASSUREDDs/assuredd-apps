import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AddressSuggestion } from '@/shared/lib/address-suggest';
import { TextField } from '@/shared/ui/TextField';
import { colors } from '@/shared/ui/theme/colors';

import { useAddressSuggestions, useCityCenter } from '../model/use-address-suggestions';

interface StreetFieldProps {
    value: string;
    city: string;
    error?: string;
    onChangeText: (value: string) => void;
    onSelect: (suggestion: AddressSuggestion) => void;
}

export function StreetField({ value, city, error, onChangeText, onSelect }: StreetFieldProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation();
    const cityCenter = useCityCenter(city);
    const suggestions = useAddressSuggestions(isOpen ? value : '', cityCenter.data ?? undefined);

    function handleChangeText(next: string) {
        setIsOpen(true);
        onChangeText(next);
    }

    function handleSelect(suggestion: AddressSuggestion) {
        setIsOpen(false);
        onSelect(suggestion);
    }

    const items = isOpen ? (suggestions.data ?? []) : [];
    const isSearching = isOpen && suggestions.isFetching && items.length === 0;

    return (
        <View style={styles.container}>
            <TextField
                label={t('auth.register.streetLabel')}
                value={value}
                onChangeText={handleChangeText}
                error={error}
                autoCorrect={false}
                autoCapitalize="words"
            />

            {isSearching ? (
                <View style={[styles.dropdown, styles.searching]}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : null}

            {isOpen && !city.trim() ? <Text style={styles.hint}>{t('auth.register.streetHint')}</Text> : null}

            {items.length > 0 ? (
                <View style={styles.dropdown}>
                    {items.map((item, index) => (
                        <Pressable
                            key={item.id}
                            onPress={() => handleSelect(item)}
                            style={({ pressed }) => [
                                styles.option,
                                index > 0 && styles.optionDivider,
                                pressed && styles.optionPressed,
                            ]}
                        >
                            <Text style={styles.street}>{item.street}</Text>
                            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
                        </Pressable>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 6,
    },
    dropdown: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    searching: {
        padding: 14,
        alignItems: 'center',
    },
    option: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 2,
    },
    optionDivider: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    optionPressed: {
        backgroundColor: colors.background,
    },
    street: {
        fontSize: 15,
        color: colors.textPrimary,
    },
    description: {
        fontSize: 13,
        color: colors.textMuted,
    },
    hint: {
        fontSize: 13,
        color: colors.textMuted,
    },
});
