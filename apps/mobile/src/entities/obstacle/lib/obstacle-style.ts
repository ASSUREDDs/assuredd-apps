import type { ObstacleKind } from '@app/contracts';

import { colors } from '@/shared/ui/theme/colors';

export const OBSTACLE_KINDS: readonly ObstacleKind[] = ['closed_arch', 'incident'];

export const OBSTACLE_COLORS: Record<ObstacleKind, string> = {
    closed_arch: colors.danger,
    incident: colors.accent,
};

export const OBSTACLE_KIND_LABEL_KEYS: Record<ObstacleKind, string> = {
    closed_arch: 'obstacle.kind.closed_arch',
    incident: 'obstacle.kind.incident',
};
