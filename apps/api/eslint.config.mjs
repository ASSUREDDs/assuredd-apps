import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default tseslint.config(
    { ignores: ['dist/**', 'drizzle/**', 'eslint.config.mjs', 'src/migrate.ts'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        plugins: { boundaries, 'simple-import-sort': simpleImportSort },
        settings: {
            'import/resolver': {
                typescript: { project: './tsconfig.json' },
            },
            'boundaries/include': ['src/**/*.ts'],
            'boundaries/elements': [
                { type: 'domain',         pattern: 'src/domain/*',         capture: ['feature'] },
                { type: 'application',    pattern: 'src/application/*',    capture: ['feature'] },
                { type: 'infrastructure', pattern: 'src/infrastructure/*', capture: ['feature'] },
                { type: 'presentation',   pattern: 'src/presentation/*',   capture: ['feature'] },
                { type: 'root',           pattern: 'src/*.ts',             mode: 'file' },
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
                        {
                            from: 'domain',
                            allow: [
                                ['domain', { feature: '${from.feature}' }],
                                ['domain', { feature: 'shared' }],
                            ],
                        },
                        {
                            from: 'application',
                            allow: [
                                ['application', { feature: '${from.feature}' }],
                                ['application', { feature: 'shared' }],
                                ['domain', { feature: '${from.feature}' }],
                                ['domain', { feature: 'shared' }],
                            ],
                        },
                        {
                            from: 'infrastructure',
                            allow: ['infrastructure', 'application', 'domain'],
                        },
                        {
                            from: 'presentation',
                            allow: ['presentation', 'infrastructure', 'application', 'domain'],
                        },
                        {
                            from: 'root',
                            allow: ['root', 'presentation', 'infrastructure'],
                        },
                    ],
                },
            ],

            'boundaries/external': [
                'error',
                {
                    default: 'allow',
                    rules: [
                        {
                            from: ['domain'],
                            disallow: ['@nestjs/*', 'drizzle-orm', 'pg', 'zod', 'express', 'rxjs', 'reflect-metadata'],
                            message: 'Domain does not depend on external libraries',
                        },
                        {
                            from: ['application'],
                            disallow: ['@nestjs/config', 'drizzle-orm', 'pg', 'express', '@nestjs/terminus'],
                            message: 'Application is not aware of the infrastructure',
                        },
                    ],
                },
            ],

            'simple-import-sort/imports': [
                'error',
                {
                    groups: [
                        ['^\\u0000'],
                        ['^node:', '^[a-z]', '^@(?!domain|application|infrastructure|presentation)'],
                        ['^@domain', '^@application', '^@infrastructure', '^@presentation'],
                        ['^\\.'],
                    ],
                },
            ],
            'simple-import-sort/exports': 'error',
        },
    },
);
