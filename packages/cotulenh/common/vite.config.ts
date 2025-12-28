import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CoTuLenhCommon',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: [],
      output: {
        preserveModules: false,
        exports: 'named',
        sourcemap: true
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      outDir: 'dist'
    })
  ]
});
