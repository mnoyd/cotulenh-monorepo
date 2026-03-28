import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const useTestPreprocess = Boolean(process.env.VITEST);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md', '.svx'],

  preprocess: [
    vitePreprocess(
      useTestPreprocess
        ? {
            // Vitest currently fails while Vite preprocesses plain component styles.
            // Skip style preprocessing in tests; the app's only postcss component
            // is not imported by the current runtime component tests.
            style: false
          }
        : undefined
    ),
    mdsvex({
      extensions: ['.md', '.svx'],
      layout: {
        learn: join(__dirname, 'src/lib/learn/layouts/LearnLayout.svelte')
      }
    })
  ],

  kit: {
    adapter: adapter({
      runtime: 'nodejs22.x'
    })
  }
};

export default config;
