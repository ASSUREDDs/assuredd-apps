import { StyleSheet, Text, View } from 'react-native';

import { useLogout } from '@/features/auth/model/use-logout';
import { useSessionStore } from '@/entities/session/session.store';
import { Button } from '@/shared/ui/Button';
import { Screen } from '@/shared/ui/Screen';
import { colors } from '@/shared/ui/theme/colors';

export default function ProfileScreen() {
    const user = useSessionStore((state) => state.user);
    const logout = useLogout();

    if (!user) return null;

    return (
        <Screen>
            <Text style={styles.name}>
                {user.firstName} {user.lastName}
            </Text>
            <View style={styles.section}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user.email}</Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.label}>Phone</Text>
                <Text style={styles.value}>
                    {user.phone.countryCode} {user.phone.number}
                </Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.value}>
                    {user.address.street} {user.address.houseNumber}, {user.address.city}
                </Text>
            </View>
            <Button label="Log out" variant="secondary" onPress={() => logout.mutate()} loading={logout.isPending} />
        </Screen>
    );
}

const styles = StyleSheet.create({
    name: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    section: {
        gap: 4,
    },
    label: {
        fontSize: 13,
        color: colors.textMuted,
    },
    value: {
        fontSize: 16,
        color: colors.textPrimary,
    },
});
