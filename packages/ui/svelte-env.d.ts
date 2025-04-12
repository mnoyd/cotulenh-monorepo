/// <reference types="svelte" />
/// <reference types="vite/client" /> // Assuming Vite, remove if not applicable

// Declare Svelte components as modules
declare module '*.svelte' {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export default class extends SvelteComponent<any, any, any> {}
}
