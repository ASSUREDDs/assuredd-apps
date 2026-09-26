import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from './theme/colors';

interface TextFieldProps extends TextInputProps {
    label: string;
    error?: string;
}

export function TextField({ label, error, style, ...props }: TextFieldProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                {...props}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, Boolean(error) && styles.inputError, style]}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
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
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.textPrimary,
    },
    inputError: {
        borderColor: colors.danger,
    },
    error: {
        color: colors.danger,
        fontSize: 13,
    },
});
