/**
 * CSS Cache
 *
 * Memoizes generated CSS to avoid redundant computation.
 */

import type { ResolvedThemeConfig } from '../types.js';
import { generateThemeCSS, generateEffectCSS } from '../css-generator.js';

interface CachedCSS {
  vars: string;
  effects: string;
  version: string;
}

/**
 * CSS generation cache
 */
const cssCache = new Map<string, CachedCSS>();

/**
 * Generate cache key for a theme
 */
function getCacheKey(theme: ResolvedThemeConfig): string {
  return `${theme.meta.id}:${theme.meta.version}`;
}

/**
 * Get cached CSS or generate and cache it
 */
export function getCachedCSS(theme: ResolvedThemeConfig): CachedCSS {
  const key = getCacheKey(theme);

  // Check cache
  const cached = cssCache.get(key);
  if (cached) {
    return cached;
  }

  // Generate CSS
  const result: CachedCSS = {
    vars: generateThemeCSS(theme),
    effects: generateEffectCSS(theme),
    version: theme.meta.version
  };

  // Cache it
  cssCache.set(key, result);
  return result;
}

/**
 * Check if CSS is cached for a theme
 */
export function isCSSCached(theme: ResolvedThemeConfig): boolean {
  return cssCache.has(getCacheKey(theme));
}

/**
 * Clear CSS cache for a specific theme
 */
export function clearThemeCSSCache(themeId: string): void {
  for (const key of Array.from(cssCache.keys())) {
    if (key.startsWith(`${themeId}:`)) {
      cssCache.delete(key);
    }
  }
}

/**
 * Clear entire CSS cache
 */
export function clearCSSCache(): void {
  cssCache.clear();
}

/**
 * Get cache stats (for debugging)
 */
export function getCSSCacheStats(): { size: number; keys: string[] } {
  return {
    size: cssCache.size,
    keys: Array.from(cssCache.keys())
  };
}
