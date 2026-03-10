import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts']
  }
});
