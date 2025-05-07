import { defineConfig } from 'vitest/config'
import { createVitestConfig } from '@repo/vitest-config/vitest.setup.js'

export default defineConfig(
  createVitestConfig({
    // Add any package-specific configuration here
    test: {
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
