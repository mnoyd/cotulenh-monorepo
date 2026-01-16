import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CotulenhLearn',
      formats: ['es', 'cjs'],
      fileName: (format) => `learn.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: ['@cotulenh/core', '@cotulenh/common']
    }
  }
});
