import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/cotulenh.ts'),
      name: 'CoTuLenh',
      formats: ['es', 'cjs'],
      fileName: (format) => `cotulenh.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['quick-lru', '@repo/cotulenh-combine-piece'],
      output: {
        preserveModules: false,
        exports: 'named',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      outDir: 'dist',
    }),
  ],
})
