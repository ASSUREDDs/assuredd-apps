import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
    { ignores: ['ios/**', 'android/**', '.expo/**', 'node_modules/**', 'eslint.config.mjs', 'app.config.ts'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: { boundaries },
        settings: {
            'import/resolver': {
                typescript: { project: './tsconfig.json' },
            },
            'boundaries/include': ['src/**/*.{ts,tsx}'],
            'boundaries/elements': [
                { type: 'app',      pattern: 'src/app',        mode: 'folder' },
                { type: 'features', pattern: 'src/features/*', capture: ['slice'] },
                { type: 'entities', pattern: 'src/entities/*', capture: ['slice'] },
                { type: 'shared',   pattern: 'src/shared/*',   capture: ['segment'] },
            ],
        },
        rules: {
            'boundaries/no-unknown-files': 'error',
            'boundaries/no-unknown': 'error',
            'boundaries/element-types': [
                'error',
                {
                    default: 'disallow',
                    rules: [
                        { from: 'app',      allow: ['app', 'features', 'entities', 'shared'] },
                        { from: 'features', allow: [['features', { slice: '${from.slice}' }], 'entities', 'shared'] },
                        { from: 'entities', allow: [['entities', { slice: '${from.slice}' }], 'shared'] },
                        { from: 'shared',   allow: ['shared'] },
                    ],
                },
            ],
        },
    },
);