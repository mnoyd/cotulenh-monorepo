import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const config: Record<string, unknown> = {
    plugins: [sveltekit()],
    optimizeDeps: {
      include: [],
      // Exclude workspace packages from pre-bundling in dev to use source directly
      // All packages now work with source debugging (circular dependency fixed)
      exclude:
        mode === 'development'
          ? ['@cotulenh/core', '@cotulenh/board', '@cotulenh/combine-piece']
          : []
    },
    ssr: {
      noExternal: [
        '@cotulenh/core',
        '@cotulenh/board',
        '@cotulenh/common',
        '@cotulenh/combine-piece'
      ],
      external: []
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
        // Development: Point to source entry files for seamless debugging
        // Circular dependency fixed via popup registry pattern
        '@cotulenh/core': path.resolve(
          __dirname,
          '../../../packages/cotulenh/core/src/cotulenh.ts'
        ),
        '@cotulenh/board/assets': path.resolve(
          __dirname,
          '../../../packages/cotulenh/board/assets'
        ),
        '@cotulenh/board': path.resolve(__dirname, '../../../packages/cotulenh/board/src/index.ts'),
        '@cotulenh/combine-piece': path.resolve(
          __dirname,
          '../../../packages/cotulenh/combine-piece/src/index.ts'
        ),
        '@cotulenh/common': path.resolve(
          __dirname,
          '../../../packages/cotulenh/common/src/index.ts'
        )
      }
    };
  }

  return config;
});
