import globals from 'globals';

import {
    globalNoExtraneousDependenciesDevDependencies,
    importConfig,
} from './eslintConfig/importConfig.mjs';
import { javascriptConfig } from './eslintConfig/javascriptConfig.mjs';
import { javascriptNodejsConfig } from './eslintConfig/javascriptNodejsConfig.mjs';
import { typescriptConfig } from './eslintConfig/typescriptConfig.mjs';

export default [
    {
        ignores: [
            '**/lib/*',
            '**/dist/*',
            '**/coverage/*',
            '**/build/*',
            '**/node_modules/*',
            '**/.cache/*',
        ],
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    },
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2021,
            },
        },
    },

    ...javascriptConfig,
    ...javascriptNodejsConfig,
    ...typescriptConfig,
    ...importConfig,

    // Test files
    {
        files: ['**/*.test.{ts,js}'],
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    // Test utilities and mocks
    {
        files: ['test/**/*.{ts,js}'],
        rules: {
            'import/no-extraneous-dependencies': 'off',
        },
    },

    // ESLint config itself
    {
        files: ['eslint.config.mjs', 'eslintConfig/**/*.mjs'],
        rules: {
            'import/no-default-export': 'off',
            // Allow using devDependencies in ESLint config files
            'import/no-extraneous-dependencies': 'off',
            // Tooling packages like 'typescript-eslint' may not be resolvable by the project resolver
            // and are only used in config, so ignore unresolved checks here
            'import/no-unresolved': 'off',
        },
    },
];

// Re-export for consumers that need to reuse the shared devDependencies glob list
export { globalNoExtraneousDependenciesDevDependencies };
