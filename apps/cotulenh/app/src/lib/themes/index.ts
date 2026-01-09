/**
 * Theme System
 *
 * Simplified theme management using static CSS files.
 * CSS files are located in /static/themes/[theme]/ and loaded via <link> tag swapping.
 *
 * @example
 * ```ts
 * import { themeController } from '$lib/themes';
 *
 * // Initialize (loads saved theme or default)
 * await themeController.init();
 *
 * // Switch themes
 * await themeController.setTheme('classic');
 *
 * // Access current theme
 * console.log(themeController.current); // 'classic'
 * ```
 */

export { themeController, themes, type ThemeId, type ThemeInfo } from './controller.svelte.js';
