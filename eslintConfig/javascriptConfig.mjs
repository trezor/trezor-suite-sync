import pluginJs from '@eslint/js';

export const javascriptConfig = [
    pluginJs.configs.recommended,
    {
        rules: {
            // Additional rules (based on pasted config)
            'no-console': ['error', { allow: ['warn', 'error'] }],
            'arrow-body-style': ['error', 'as-needed'],
            'require-await': ['error'],
            'no-nested-ternary': 'error',
            'prefer-destructuring': [
                'error',
                {
                    VariableDeclarator: {
                        array: false,
                        object: true,
                    },
                    AssignmentExpression: {
                        array: false,
                        object: false,
                    },
                },
                {
                    enforceForRenamedProperties: false,
                },
            ],
            'no-label-var': 'error',
            'no-undef-init': 'error',
            'no-restricted-syntax': [
                'error',
                {
                    message:
                        "Please don't use createAsyncThunk. Use createThunk from @suite-common/redux-utils instead.",
                    selector: "CallExpression[callee.name='createAsyncThunk']",
                },
                {
                    message:
                        'Please don\'t use getState directly. Always use strongly typed selector, because geState is typed as "any" and it\'s dangerous to use it directly.',
                    selector:
                        'MemberExpression[property.type="Identifier"]:matches([object.callee.name="getState"])',
                },
                {
                    message:
                        'Do not assign "getState" directly. Always use strongly typed selector, because geState is typed as "any" and it\'s dangerous to use it directly.',
                    selector:
                        "VariableDeclarator[init.type='CallExpression']:matches([init.callee.name='getState'])",
                },
                {
                    message:
                        'Please don\'t use "state" directly because it\'s typed as "any". Always use it only as parameter for strongly typed selector function.',
                    selector:
                        "CallExpression[callee.name='useSelector'] MemberExpression[object.name='state']:matches([property.type='Identifier'])",
                },
            ],
            'object-shorthand': [
                'error',
                'always',
                {
                    ignoreConstructors: false,
                    avoidQuotes: true,
                },
            ],
            'no-useless-rename': [
                'error',
                {
                    ignoreDestructuring: false,
                    ignoreImport: false,
                    ignoreExport: false,
                },
            ],
            'prefer-numeric-literals': 'error',
            'padding-line-between-statements': [
                'error',
                { blankLine: 'always', prev: '*', next: 'return' },
            ],

            // Offs
            'no-undef': 'off',
            // Offs for Node.js
            'no-sync': 'off',
            'no-process-exit': 'off',
        },
    },
    {
        files: ['**/*.js'],
        rules: {
            // Config files often need console output
            'no-console': 'off',
        },
    },
];
