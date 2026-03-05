import pluginImport from 'eslint-plugin-import';

export const globalNoExtraneousDependenciesDevDependencies = [
    '**/*fixtures*/**',
    '**/*.test.{tsx,ts,js}',
    '**/eslint.config.mjs',
    '**/eslintConfig/**',
    '**/vitest.config.{ts,js,mts,mjs}',
];

export const importConfig = [
    pluginImport.flatConfigs.recommended,
    {
        settings: {
            'import/ignore': ['node_modules', '\\.(coffee|scss|css|less|hbs|svg|json)$'],
            'import/resolver': {
                node: {
                    extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx'],
                },
            },
            // Map ESM import extensions to TS source files in NodeNext projects
            'import/extensionAlias': {
                '.js': ['.js', '.ts'],
                '.mjs': ['.mjs', '.mts'],
                '.cjs': ['.cjs', '.cts'],
            },
        },
        rules: {
            // Additional
            'import/no-anonymous-default-export': [
                'error',
                {
                    allowArray: true,
                    allowLiteral: true,
                    allowObject: true,
                },
            ],
            'sort-imports': [
                1,
                {
                    ignoreCase: false,
                    ignoreDeclarationSort: true, // don't want to sort import lines, use eslint-plugin-import instead
                    ignoreMemberSort: false,
                    memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
                    allowSeparatedGroups: true,
                },
            ],
            'import/order': [
                'warn',
                {
                    groups: [['builtin', 'external'], 'internal', ['sibling', 'parent']],
                    pathGroups: [{ pattern: 'src/**', group: 'internal', position: 'after' }],
                    pathGroupsExcludedImportTypes: ['internal'],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc' },
                },
            ],
            'import/no-extraneous-dependencies': [
                'error',
                {
                    devDependencies: globalNoExtraneousDependenciesDevDependencies,
                    includeTypes: true,
                },
            ],

            'import/newline-after-import': 'error',
            'import/no-duplicates': 'error',
            'import/no-useless-path-segments': 'error',
            'import/no-cycle': 'error',
            'import/no-self-import': 'error',
        },
    },
    // In TypeScript files, disable no-unresolved due to NodeNext extension mapping and TS compilation step
    {
        files: ['**/*.{ts,tsx}'],
        rules: {
            'import/no-unresolved': 'off',
        },
    },
];
