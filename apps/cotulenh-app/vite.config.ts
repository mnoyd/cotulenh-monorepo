import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		include: ['@repo/cotulenh-notation']
	},
	ssr: {
		noExternal: ['@repo/cotulenh-notation']
	}
});
