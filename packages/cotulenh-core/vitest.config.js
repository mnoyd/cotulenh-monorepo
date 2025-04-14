import { defineConfig } from 'vitest/config';
import { createVitestConfig } from '@repo/vitest-config/vitest.setup.js';

export default defineConfig(createVitestConfig({
  // Add any package-specific configuration here
  test: {
    // Include tsconfig.test.json if needed
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
}));
