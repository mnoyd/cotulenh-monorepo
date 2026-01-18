import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      exclude: ['**/*.test.ts']
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CotulenhLearn',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: ['@cotulenh/core', '@cotulenh/common'],
      output: {
        globals: {
          '@cotulenh/core': 'CotulenhCore',
          '@cotulenh/common': 'CotulenhCommon'
        }
      }
    }
  }
});
