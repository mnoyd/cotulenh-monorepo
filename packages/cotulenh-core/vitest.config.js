import { defineConfig } from 'vitest/config'
import { createVitestConfig } from '@repo/vitest-config/vitest.setup.js'

export default defineConfig(
  createVitestConfig({
    // Add any package-specific configuration here
    test: {
      // Exclude legacy tests by default (archived for reference only)
      // Exclude behavior tests - they require features not yet rebuilt (Phase 2+)
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/__tests__/legacy/**', // Legacy tests archived
        '**/__tests__/behavior/**', // Behavior tests require CoTuLenh class (Phase 2+)
      ],

      // Include tsconfig.test.json if needed
      typecheck: {
        tsconfig: './tsconfig.test.json',
      },

      pool: 'forks',
      poolOptions: {
        forks: {
          execArgv: [
            '--cpu-prof',
            '--cpu-prof-dir=test-runner-profile',
            '--heap-prof',
            '--heap-prof-dir=test-runner-profile',
          ],

          // To generate a single profile
          singleFork: true,
        },
      },
    },
  }),
)
