export const palette = {
    charcoal: '#222222',
    fog: '#EAEAEA',
    espresso: '#5E2F29',
    mustard: '#E5B244',
    amber: '#E88F47',
    coral: '#E26645',
} as const;

export const colors = {
    background: palette.fog,
    surface: '#FFFFFF',
    border: palette.fog,
    textPrimary: palette.charcoal,
    textInverse: '#FFFFFF',
    textMuted: palette.espresso,
    primary: palette.amber,
    primaryPressed: palette.espresso,
    accent: palette.mustard,
    danger: palette.coral,
} as const;
