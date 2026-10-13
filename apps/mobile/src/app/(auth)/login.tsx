import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, View } from 'react-native';

import { LoginForm } from '@/features/auth/ui/LoginForm';
import { Screen } from '@/shared/ui/Screen';
import { colors } from '@/shared/ui/theme/colors';

export default function LoginScreen() {
    const { t } = useTranslation();

    return (
        <Screen>
            <View style={styles.container}>
                <View style={styles.top}>
                    <Text style={styles.title}>{t('auth.login.title')}</Text>
                    <LoginForm />
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{t('auth.login.noAccount')}</Text>
                        <Link href="/(auth)/register">
                            <Text style={styles.link}>{t('auth.login.signUp')}</Text>
                        </Link>
                    </View>
                </View>
                {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
                <Image source={require('../../../assets/login_bird.png')} style={styles.bird} resizeMode="contain" />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    top: {
        flex: 1,
        justifyContent: 'center',
        gap: 16,
    },
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
        marginTop: 16,
    },
    footerText: {
        color: colors.textMuted,
    },
    link: {
        color: colors.primary,
        fontWeight: '600',
    },
    bird: {
        height: 240,
        aspectRatio: 2300 / 3000,
        alignSelf: 'center',
        marginBottom: -20,
    },
});
