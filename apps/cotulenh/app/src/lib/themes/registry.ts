/**
 * Theme Registry
 *
 * Central registry for all available themes with lazy loading support.
 * Handles theme registration, lookup, resolution, and caching.
 */

import type { ThemeConfig, ThemeId, ThemeInfo, ResolvedThemeConfig } from './types.js';
import { resolveTheme } from './core/inheritance.js';

/**
 * Theme registry - stores all available theme configurations
 */
const themeRegistry = new Map<ThemeId, ThemeConfig>();

/**
 * Resolved theme cache - stores fully resolved themes
 */
const resolvedCache = new Map<ThemeId, ResolvedThemeConfig>();

/**
 * Registered themes info (for UI display)
 */
const themesInfo: ThemeInfo[] = [];

/**
 * Lazy theme loaders - load theme on demand
 */
const themeLoaders: Record<ThemeId, () => Promise<ThemeConfig>> = {
  base: async () => (await import('./themes/base/index.js')).default,
  'modern-warfare': async () =>
    (await import('./themes/modern-warfare/index.js')).modernWarfareTheme,
  classic: async () => (await import('./themes/classic/index.js')).classicTheme,
  forest: async () => (await import('./themes/forest/index.js')).forestTheme
};

/**
 * Theme metadata for UI (available before loading)
 */
const themeMetadata: Record<ThemeId, ThemeInfo> = {
  base: {
    id: 'base',
    name: 'Base',
    description: 'Foundation theme with default values'
  },
  'modern-warfare': {
    id: 'modern-warfare',
    name: 'Modern Warfare',
    description: 'Tactical HUD with cyan/amber accents'
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional warm wood tones'
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green military aesthetic'
  }
};

/**
 * Register a theme configuration (for eagerly loaded themes)
 */
export function registerTheme(config: ThemeConfig): void {
  themeRegistry.set(config.meta.id as ThemeId, config);

  // Add to themes info if not already present
  if (!themesInfo.find((t) => t.id === config.meta.id)) {
    themesInfo.push({
      id: config.meta.id as ThemeId,
      name: config.meta.name,
      description: config.meta.description
    });
  }

  // Clear resolved cache for this theme (may need re-resolution)
  resolvedCache.delete(config.meta.id as ThemeId);
}

/**
 * Load a theme lazily (if not already loaded)
 */
export async function loadTheme(id: ThemeId): Promise<ThemeConfig> {
  // Check if already loaded
  const cached = themeRegistry.get(id);
  if (cached) return cached;

  // Check if we have a loader
  const loader = themeLoaders[id];
  if (!loader) {
    throw new Error(`Unknown theme: ${id}`);
  }

  // Load and register
  const config = await loader();
  registerTheme(config);
  return config;
}

/**
 * Get a theme configuration by ID (sync, must be loaded first)
 */
export function getTheme(id: ThemeId): ThemeConfig | undefined {
  return themeRegistry.get(id);
}

/**
 * Get a resolved theme (with inheritance merged)
 *
 * @param id - Theme ID
 * @returns Fully resolved theme config, or undefined if not loaded
 */
export function getResolvedTheme(id: ThemeId): ResolvedThemeConfig | undefined {
  // Check cache first
  const cached = resolvedCache.get(id);
  if (cached) return cached;

  // Get the raw config
  const config = themeRegistry.get(id);
  if (!config) return undefined;

  // Resolve inheritance
  const resolved = resolveTheme(config, getTheme);
  resolvedCache.set(id, resolved);
  return resolved;
}

/**
 * Load and resolve a theme (async)
 */
export async function loadAndResolveTheme(id: ThemeId): Promise<ResolvedThemeConfig> {
  // If this theme extends another, load parent first
  const config = await loadTheme(id);

  if (config.extends) {
    await loadTheme(config.extends);
  }

  const resolved = getResolvedTheme(id);
  if (!resolved) {
    throw new Error(`Failed to resolve theme: ${id}`);
  }
  return resolved;
}

/**
 * Get all registered themes info (for UI display)
 * Returns metadata without loading theme configs
 */
export function getAllThemesInfo(): ThemeInfo[] {
  // Filter out 'base' theme from UI display
  return Object.values(themeMetadata).filter((t) => t.id !== 'base');
}

/**
 * Check if a theme is registered/loaded
 */
export function hasTheme(id: ThemeId): boolean {
  return themeRegistry.has(id);
}

/**
 * Check if a theme can be loaded
 */
export function canLoadTheme(id: ThemeId): boolean {
  return id in themeLoaders;
}

/**
 * Get all registered theme IDs
 */
export function getThemeIds(): ThemeId[] {
  return Array.from(themeRegistry.keys());
}

/**
 * Get all available theme IDs (including unloaded)
 */
export function getAllThemeIds(): ThemeId[] {
  return Object.keys(themeLoaders) as ThemeId[];
}

/**
 * Clear all registered themes (useful for testing)
 */
export function clearThemes(): void {
  themeRegistry.clear();
  resolvedCache.clear();
  themesInfo.length = 0;
}

/**
 * Clear resolved theme cache
 */
export function clearResolvedCache(): void {
  resolvedCache.clear();
}
