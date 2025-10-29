import tseslint from 'typescript-eslint';

export const typescriptConfig = [
    ...tseslint.configs.recommended,
    {
        rules: {
            // Additional rules
            '@typescript-eslint/no-use-before-define': ['error'],
            '@typescript-eslint/no-shadow': [
                'error',
                {
                    builtinGlobals: false,
                    allow: ['_', 'error', 'resolve', 'reject', 'fetch'],
                },
            ],
            '@typescript-eslint/no-restricted-imports': [
                'error',
                {
                    paths: [{ name: '.' }, { name: '..' }, { name: '../..' }],
                    patterns: [
                        '@trezor/*/lib',
                        '@trezor/*/lib/**',
                        '@trezor/*/libDev',
                        '@trezor/*/libDev/**',
                        '@trezor/*/libESM',
                        '@trezor/*/libESM/**',
                    ],
                },
            ],

            // Additions from "plugin:@typescript-eslint/strict"
            '@typescript-eslint/no-useless-constructor': ['error'],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    args: 'none',
                    ignoreRestSiblings: true,
                    varsIgnorePattern: '^_',
                },
            ],

            // Offs
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/ban-ts-comment': [
                'error',
                {
                    minimumDescriptionLength: 0,
                },
            ],
            '@typescript-eslint/no-empty-object-type': 'off',
        },
    },
];
