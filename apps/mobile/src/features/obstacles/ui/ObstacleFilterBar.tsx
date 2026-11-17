import type { ObstacleKind } from '@app/contracts';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OBSTACLE_COLORS, OBSTACLE_KIND_LABEL_KEYS, OBSTACLE_KINDS } from '@/entities/obstacle/lib/obstacle-style';
import { colors } from '@/shared/ui/theme/colors';

interface ObstacleFilterBarProps {
    selected: ObstacleKind[];
    onChange: (kinds: ObstacleKind[]) => void;
}

export function ObstacleFilterBar({ selected, onChange }: ObstacleFilterBarProps) {
    const { t } = useTranslation();

    function toggle(kind: ObstacleKind) {
        onChange(selected.includes(kind) ? selected.filter((k) => k !== kind) : [...selected, kind]);
    }

    return (
        <View style={styles.row}>
            {OBSTACLE_KINDS.map((kind) => {
                const isOn = selected.includes(kind);
                return (
                    <Pressable
                        key={kind}
                        onPress={() => toggle(kind)}
                        style={[styles.chip, isOn && { borderColor: OBSTACLE_COLORS[kind] }]}
                        hitSlop={6}
                    >
                        <View style={[styles.dot, { backgroundColor: isOn ? OBSTACLE_COLORS[kind] : colors.border }]} />
                        <Text style={[styles.label, !isOn && styles.labelOff]}>{t(OBSTACLE_KIND_LABEL_KEYS[kind])}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    labelOff: {
        color: colors.textMuted,
    },
});
