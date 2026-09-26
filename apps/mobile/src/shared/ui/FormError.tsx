import { StyleSheet, Text } from 'react-native';

import { colors } from './theme/colors';

interface FormErrorProps {
    message?: string;
}

export function FormError({ message }: FormErrorProps) {
    if (!message) return null;
    return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
    text: {
        color: colors.danger,
        fontSize: 14,
        textAlign: 'center',
    },
});
