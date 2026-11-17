import type { AddressSuggestion } from '@app/contracts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { LngLat } from '@/shared/lib/geo';
import { colors } from '@/shared/ui/theme/colors';

import { useAddressSearch } from '../model/use-address-search';

interface AddressSearchBarProps {
    /** Biases the results toward where the courier is. */
    near: LngLat | null;
    /** Text for a destination set some other way (a long press on the map). */
    destinationLabel: string | null;
    onSelect: (address: AddressSuggestion) => void;
    onClear: () => void;
}

export function AddressSearchBar({ near, destinationLabel, onSelect, onClear }: AddressSearchBarProps) {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const search = useAddressSearch(isOpen ? text : '', near);

    const items = isOpen ? (search.data ?? []) : [];
    const shown = destinationLabel ?? text;
    const hasValue = shown.length > 0;

    function handleSelect(address: AddressSuggestion) {
        setText(address.label);
        setIsOpen(false);
        onSelect(address);
    }

    function handleClear() {
        setText('');
        setIsOpen(false);
        onClear();
    }

    return (
        <View style={styles.container}>
            <View style={styles.field}>
                <TextInput
                    value={shown}
                    onChangeText={(next) => {
                        setText(next);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={t('route.searchPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    autoCorrect={false}
                    returnKeyType="search"
                    style={styles.input}
                />
                {search.isFetching && isOpen ? <ActivityIndicator color={colors.primary} /> : null}
                {hasValue ? (
                    <Pressable onPress={handleClear} hitSlop={12}>
                        <Text style={styles.clear}>✕</Text>
                    </Pressable>
                ) : null}
            </View>

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
                            <Text style={styles.optionText}>{item.label}</Text>
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
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    input: {
        flex: 1,
        paddingVertical: 13,
        fontSize: 16,
        color: colors.textPrimary,
    },
    clear: {
        fontSize: 17,
        color: colors.textMuted,
    },
    dropdown: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    option: {
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    optionDivider: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    optionPressed: {
        backgroundColor: colors.background,
    },
    optionText: {
        fontSize: 15,
        color: colors.textPrimary,
    },
});
