import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const config: any = {
    plugins: [sveltekit()],
    optimizeDeps: {
      include: [],
      // Exclude workspace packages from pre-bundling in dev to use source directly
      exclude:
        mode === 'development'
          ? ['@repo/cotulenh-core', '@repo/cotulenh-board', '@repo/cotulenh-combine-piece']
          : []
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
        // Allow serving files from monorepo root
        allow: ['../..']
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
  };

  // Only add aliases in development mode for source debugging
  if (mode === 'development') {
    config.resolve = {
      alias: {
        // Development: Point to source files for seamless debugging
        '@repo/cotulenh-core': path.resolve(
          __dirname,
          '../../packages/cotulenh-core/src/cotulenh.ts'
        ),
        '@repo/cotulenh-board': path.resolve(__dirname, '../../packages/cotulenh-board/src'),
        '@repo/cotulenh-combine-piece': path.resolve(
          __dirname,
          '../../packages/cotulenh-combine-piece/src/index.ts'
        )
      }
    };
  }

  return config;
});
