import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Shared disabled rules for the project
const disabledRules = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  '@typescript-eslint/no-unused-expressions': 'off',
  '@typescript-eslint/no-empty-object-type': 'off',
  '@typescript-eslint/ban-ts-comment': 'off',
  '@typescript-eslint/no-require-imports': 'off',
  'no-useless-escape': 'off',
  'prefer-const': 'off'
};

// Base config for TypeScript packages (non-Svelte)
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: disabledRules
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      }
    }
  },
  {
    ignores: ['dist/', 'coverage/', 'node_modules/']
  }
];

// Config for Svelte app
export const svelteConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    rules: {
      ...disabledRules,
      'svelte/valid-compile': 'off'
    }
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    ignores: ['.svelte-kit/', 'build/']
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    }
  }
];

// Legacy export for backwards compatibility
export const config = svelteConfig;
