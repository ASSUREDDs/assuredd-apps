import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RegisterForm } from '@/features/auth/ui/RegisterForm';
import { Screen } from '@/shared/ui/Screen';
import { colors } from '@/shared/ui/theme/colors';

export default function RegisterScreen() {
    return (
        <Screen centered>
            <Text style={styles.title}>Create account</Text>
            <RegisterForm />
            <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <Link href="/(auth)/login">
                    <Text style={styles.link}>Log in</Text>
                </Link>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 8,
    },
    footerText: {
        color: colors.textMuted,
    },
    link: {
        color: colors.primary,
        fontWeight: '600',
    },
});
