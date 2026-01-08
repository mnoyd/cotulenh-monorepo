/**
 * Theme System
 *
 * Comprehensive theme management for CoTuLenh application.
 * Supports lazy loading, theme inheritance, CSS caching, and priority asset loading.
 *
 * @example
 * ```ts
 * import { initThemes, applyTheme } from '$lib/themes';
 *
 * // Initialize (loads default theme)
 * await initThemes();
 *
 * // Switch themes (lazy loads on demand)
 * await applyTheme('classic');
 * ```
 */

// Re-export types
export type {
  ThemeConfig,
  ResolvedThemeConfig,
  ThemeId,
  ThemeInfo,
  ThemeLayers,
  ThemeColors,
  ThemeAssets,
  ThemeEffects,
  ThemeAnimations,
  ThemeUI
} from './types.js';

// Re-export registry functions
export {
  registerTheme,
  getTheme,
  getResolvedTheme,
  loadTheme,
  loadAndResolveTheme,
  getAllThemesInfo,
  hasTheme,
  canLoadTheme,
  getThemeIds,
  getAllThemeIds,
  clearThemes,
  clearResolvedCache
} from './registry.js';

// Re-export CSS generator functions
export {
  generateThemeCSS,
  generateEffectCSS,
  injectThemeCSS,
  removeAllThemeCSS
} from './css-generator.js';

// Re-export CSS cache functions
export { getCachedCSS, clearCSSCache, isCSSCached } from './generators/cache.js';

// Re-export asset loader functions
export {
  loadAsset,
  loadSVGText,
  preloadThemeAssets,
  loadPieceAssets,
  generatePieceCSS,
  injectPieceCSS,
  clearAssetCache,
  getCachedAsset,
  isAssetCached
} from './asset-loader.js';

// Re-export inheritance utilities
export { deepMerge, resolveTheme } from './core/inheritance.js';

// Imports for internal use
import type { ThemeId, ResolvedThemeConfig } from './types.js';
import { loadTheme, loadAndResolveTheme, getResolvedTheme, getAllThemeIds } from './registry.js';
import { injectThemeCSS, removeAllThemeCSS } from './css-generator.js';
import { preloadThemeAssets, clearAssetCache } from './asset-loader.js';

/**
 * Initialize the theme system
 *
 * Only loads the initial theme - other themes are loaded on demand.
 *
 * @param initialThemeId - Theme to load at startup (default: 'modern-warfare')
 */
export async function initThemes(initialThemeId: ThemeId = 'modern-warfare'): Promise<void> {
  // Load base theme first (needed for inheritance)
  await loadTheme('base');

  // Load and apply initial theme
  await applyTheme(initialThemeId);
}

/**
 * Apply a theme by loading (if needed), resolving inheritance, and injecting CSS
 *
 * @param themeId - The theme ID to apply
 */
export async function applyTheme(themeId: ThemeId): Promise<ResolvedThemeConfig> {
  // Load and resolve the theme (handles inheritance)
  const resolved = await loadAndResolveTheme(themeId);

  // Inject CSS custom properties and effect styles
  injectThemeCSS(resolved);

  // Preload critical assets
  await preloadThemeAssets(themeId, resolved.assets);

  return resolved;
}

/**
 * Get the resolved theme config (sync, must be loaded first)
 *
 * @param themeId - Theme ID
 */
export function getThemeConfig(themeId: ThemeId): ResolvedThemeConfig | undefined {
  return getResolvedTheme(themeId);
}

/**
 * Get all available themes (for iteration/preloading)
 */
export function getAvailableThemes(): ThemeId[] {
  // Filter out 'base' theme from public list
  return getAllThemeIds().filter((id) => id !== 'base');
}

/**
 * Clean up theme resources
 *
 * Call this when switching themes or on app cleanup to free memory.
 */
export function cleanupThemes(): void {
  removeAllThemeCSS();
  clearAssetCache();
}
