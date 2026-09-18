const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');
const { defineConfig } = require('eslint/config');
const jest = require('eslint-plugin-jest');

module.exports = defineConfig(
  // 1. Global ignores — a block with ONLY `ignores` applies to the whole run
  { ignores: ['dist/', 'node_modules/', '.yarn/', 'coverage/'] },

  // 2. TypeScript source
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },

  // 3. Migrations & seeds
  {
    files: ['src/database/**/*.js', '*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },

  // 4. Tests — Jest environment
  {
    files: ['src/**/*.test.ts'],
    plugins: { jest },
    languageOptions: { globals: globals.jest },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
    },
  },
);
