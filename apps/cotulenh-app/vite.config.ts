import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: []
  },
  ssr: {
    noExternal: []
  },
  build: {
    sourcemap: true,
    minify: false // Disable minification for better debugging
  },
  server: {
    fs: {
      allow: ['..']
    },
    sourcemapIgnoreList: false // Don't ignore any files from source maps
  },
  // Enable source maps in development
  css: {
    devSourcemap: true
  },
  // Ensure source maps are generated in dev mode
  define: {
    __SVELTEKIT_DEV__: true
  }
});
