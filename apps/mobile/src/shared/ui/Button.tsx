import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors } from './theme/colors';

interface ButtonProps extends Omit<PressableProps, 'style'> {
    label: string;
    loading?: boolean;
    variant?: 'primary' | 'secondary';
}

export function Button({ label, loading, variant = 'primary', disabled, ...props }: ButtonProps) {
    const isPrimary = variant === 'primary';

    return (
        <Pressable
            {...props}
            disabled={disabled || loading}
            style={({ pressed }) => [
                styles.base,
                isPrimary ? styles.primary : styles.secondary,
                pressed && isPrimary && styles.primaryPressed,
                (disabled || loading) && styles.disabled,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={isPrimary ? colors.textInverse : colors.primary} />
            ) : (
                <Text style={isPrimary ? styles.primaryLabel : styles.secondaryLabel}>{label}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primary: {
        backgroundColor: colors.primary,
    },
    primaryPressed: {
        backgroundColor: colors.primaryPressed,
    },
    secondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.textMuted,
    },
    disabled: {
        opacity: 0.5,
    },
    primaryLabel: {
        color: colors.textInverse,
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryLabel: {
        color: colors.textMuted,
        fontSize: 16,
        fontWeight: '600',
    },
});
