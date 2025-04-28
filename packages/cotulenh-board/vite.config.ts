import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@repo/cotulenh-combine-piece': path.resolve(__dirname, '../cotulenh-combine-piece/src/index'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'CotulenhBoard',
      fileName: format => `index.${format}.js`,
      formats: ['es', 'cjs'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    rollupOptions: {
      external: [],
    },
  },
});
