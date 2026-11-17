import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    InteractionManager,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { indexCities, searchCities, type City, type IndexedCity } from '@/shared/lib/city-search';
import { loadUkrainianCities } from '@/shared/lib/ukraine-cities';
import { colors } from '@/shared/ui/theme/colors';

/** How many rows are rendered at once; more are added as the list is scrolled. */
const PAGE_SIZE = 30;

interface CityFieldProps {
    value: string;
    error?: string;
    onSelect: (city: City) => void;
}

/** A field that opens a searchable list of every city in Ukraine. */
export function CityField({ value, error, onSelect }: CityFieldProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{t('auth.register.cityLabel')}</Text>
            <Pressable
                onPress={() => setIsOpen(true)}
                style={[styles.input, Boolean(error) && styles.inputError]}
                accessibilityRole="button"
            >
                <Text style={[styles.inputText, !value && styles.placeholder]} numberOfLines={1}>
                    {value || t('auth.register.cityPlaceholder')}
                </Text>
                <Text style={styles.chevron}>▾</Text>
            </Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {isOpen ? (
                <CityPicker
                    selectedName={value}
                    onClose={() => setIsOpen(false)}
                    onSelect={(city) => {
                        setIsOpen(false);
                        onSelect(city);
                    }}
                />
            ) : null}
        </View>
    );
}

interface CityPickerProps {
    selectedName: string;
    onClose: () => void;
    onSelect: (city: City) => void;
}

function CityPicker({ selectedName, onClose, onSelect }: CityPickerProps) {
    const { t } = useTranslation();
    const [index, setIndex] = useState<IndexedCity[] | null>(null);
    const [query, setQuery] = useState('');
    const [limit, setLimit] = useState(PAGE_SIZE);
    const deferredQuery = useDeferredValue(query);

    // Build the search index after the sheet has slid in, with a loader in the meantime.
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => setIndex(indexCities(loadUkrainianCities())));
        return () => task.cancel();
    }, []);

    const results = useMemo(() => (index ? searchCities(index, deferredQuery) : []), [index, deferredQuery]);
    const visible = useMemo(() => results.slice(0, limit), [results, limit]);
    const hasMore = visible.length < results.length;

    const handleChangeText = useCallback((text: string) => {
        setQuery(text);
        setLimit(PAGE_SIZE);
    }, []);

    const loadMore = useCallback(() => {
        if (hasMore) setLimit((current) => current + PAGE_SIZE);
    }, [hasMore]);

    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.sheet} edges={['bottom']}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('auth.register.cityPickerTitle')}</Text>
                    <Pressable onPress={onClose} hitSlop={12}>
                        <Text style={styles.close}>✕</Text>
                    </Pressable>
                </View>

                <View style={styles.searchBox}>
                    <TextInput
                        value={query}
                        onChangeText={handleChangeText}
                        placeholder={t('auth.register.citySearchPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        autoFocus
                        autoCorrect={false}
                        autoCapitalize="none"
                        clearButtonMode="while-editing"
                        style={styles.searchInput}
                    />
                </View>

                {index === null ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={visible}
                        keyExtractor={(city) => city.id}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
                        initialNumToRender={PAGE_SIZE}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => onSelect(item)}
                                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                            >
                                <Text style={[styles.rowName, item.name === selectedName && styles.rowSelected]}>{item.name}</Text>
                                {item.region ? <Text style={styles.rowRegion}>{item.region}</Text> : null}
                            </Pressable>
                        )}
                        ListEmptyComponent={<Text style={styles.empty}>{t('auth.register.cityNothingFound')}</Text>}
                        ListFooterComponent={
                            hasMore ? (
                                <View style={styles.footer}>
                                    <ActivityIndicator color={colors.primary} />
                                </View>
                            ) : null
                        }
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 6,
    },
    label: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '500',
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    inputError: {
        borderColor: colors.danger,
    },
    inputText: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
    },
    placeholder: {
        color: colors.textMuted,
    },
    chevron: {
        fontSize: 16,
        color: colors.textMuted,
    },
    error: {
        color: colors.danger,
        fontSize: 13,
    },
    sheet: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    close: {
        fontSize: 20,
        color: colors.textMuted,
    },
    searchBox: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    searchInput: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.textPrimary,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {
        paddingHorizontal: 20,
        paddingVertical: 13,
        gap: 2,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    rowPressed: {
        backgroundColor: colors.background,
    },
    rowName: {
        fontSize: 16,
        color: colors.textPrimary,
    },
    rowSelected: {
        fontWeight: '700',
        color: colors.primaryPressed,
    },
    rowRegion: {
        fontSize: 13,
        color: colors.textMuted,
    },
    empty: {
        padding: 24,
        textAlign: 'center',
        fontSize: 15,
        color: colors.textMuted,
    },
    footer: {
        paddingVertical: 16,
    },
});
