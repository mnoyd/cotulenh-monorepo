/**
 * Centralized Vitest configuration for the cotulenh monorepo
 * @type {import('vitest/config').UserConfig}
 */
export default {
  test: {
    environment: 'node',
    globals: true,
    watch: false,
    include: ['**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    },
    typecheck: {
      enabled: true
    }
  }
};
