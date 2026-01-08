/**
 * Asset Loader
 *
 * Handles lazy loading and caching of theme assets (SVGs, images).
 * Preloads critical assets and provides async loading for others.
 */

import type { ThemeAssets, ThemeId } from './types.js';

/**
 * Cached asset content storage
 */
const assetCache = new Map<string, string>();

/**
 * Pending asset loads (Promise cache)
 */
const pendingLoads = new Map<string, Promise<string>>();

/**
 * Load an asset (SVG or image) as a data URL or blob URL
 */
export async function loadAsset(url: string): Promise<string> {
  // Check cache first
  if (assetCache.has(url)) {
    return assetCache.get(url)!;
  }

  // Check if already loading
  if (pendingLoads.has(url)) {
    return pendingLoads.get(url)!;
  }

  // Create load promise
  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load asset: ${url}`);
      }
      return response.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      assetCache.set(url, objectUrl);
      pendingLoads.delete(url);
      return objectUrl;
    })
    .catch((error) => {
      pendingLoads.delete(url);
      console.error(`Failed to load asset ${url}:`, error);
      throw error;
    });

  pendingLoads.set(url, promise);
  return promise;
}

/**
 * Load SVG content as text (for inline injection)
 */
export async function loadSVGText(url: string): Promise<string> {
  // Check cache first
  if (assetCache.has(`${url}:text`)) {
    return assetCache.get(`${url}:text`)!;
  }

  // Check if already loading
  const cacheKey = `${url}:text`;
  if (pendingLoads.has(cacheKey)) {
    return pendingLoads.get(cacheKey)!;
  }

  // Create load promise
  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load SVG: ${url}`);
      }
      return response.text();
    })
    .then((text) => {
      assetCache.set(cacheKey, text);
      pendingLoads.delete(cacheKey);
      return text;
    })
    .catch((error) => {
      pendingLoads.delete(cacheKey);
      console.error(`Failed to load SVG ${url}:`, error);
      throw error;
    });

  pendingLoads.set(cacheKey, promise);
  return promise;
}

/**
 * Preload critical theme assets
 */
export async function preloadThemeAssets(themeId: ThemeId, assets: ThemeAssets): Promise<void> {
  const criticalAssets: string[] = [
    assets.board.background,
    assets.pieces.blue.infantry,
    assets.pieces.red.infantry,
    assets.pieces.blue.tank,
    assets.pieces.red.tank
  ];

  if (assets.pieces.heroic) {
    criticalAssets.push(assets.pieces.heroic);
  }

  await Promise.all(criticalAssets.map((url) => loadAsset(url)));
}

/**
 * Load all piece assets for a theme
 */
export async function loadPieceAssets(assets: ThemeAssets): Promise<{
  blue: Record<string, string>;
  red: Record<string, string>;
  heroic?: string;
}> {
  const [bluePieces, redPieces, heroic] = await Promise.all([
    Promise.all(
      Object.entries(assets.pieces.blue).map(async ([role, url]) => [role, await loadAsset(url)])
    ),
    Promise.all(
      Object.entries(assets.pieces.red).map(async ([role, url]) => [role, await loadAsset(url)])
    ),
    assets.pieces.heroic ? loadAsset(assets.pieces.heroic) : Promise.resolve(undefined)
  ]);

  return {
    blue: Object.fromEntries(bluePieces),
    red: Object.fromEntries(redPieces),
    heroic
  };
}

/**
 * Generate inline CSS for piece assets
 */
export function generatePieceCSS(
  themeId: ThemeId,
  assets: ThemeAssets,
  loadedUrls: Record<string, string>
): string {
  const rules: string[] = [];
  const prefix = `.theme-${themeId}`;

  // Generate rules for each blue piece
  for (const [role, originalUrl] of Object.entries(assets.pieces.blue)) {
    const loadedUrl = loadedUrls[originalUrl];
    if (loadedUrl) {
      rules.push(`
${prefix} piece.${role}.blue,
${prefix} piece.dragging.${role}.blue {
  background-image: url('${loadedUrl}');
}`);
    }
  }

  // Generate rules for each red piece
  for (const [role, originalUrl] of Object.entries(assets.pieces.red)) {
    const loadedUrl = loadedUrls[originalUrl];
    if (loadedUrl) {
      rules.push(`
${prefix} piece.${role}.red,
${prefix} piece.dragging.${role}.red {
  background-image: url('${loadedUrl}');
}`);
    }
  }

  // Generate rule for heroic star
  if (assets.pieces.heroic && loadedUrls[assets.pieces.heroic]) {
    rules.push(`
${prefix} cg-piece-star {
  background-image: url('${loadedUrls[assets.pieces.heroic]}');
}`);
  }

  // Generate rule for board background
  if (assets.board.background && loadedUrls[assets.board.background]) {
    rules.push(`
${prefix} cg-background {
  background-image: url('${loadedUrls[assets.board.background]}');
}`);
  }

  return rules.join('\n');
}

/**
 * Inject piece asset CSS into DOM
 */
export function injectPieceCSS(
  themeId: ThemeId,
  assets: ThemeAssets,
  loadedUrls: Record<string, string>
): void {
  const existingId = `theme-piece-styles-${themeId}`;
  const existing = document.getElementById(existingId);
  if (existing) {
    existing.remove();
  }

  const style = document.createElement('style');
  style.id = existingId;
  style.textContent = generatePieceCSS(themeId, assets, loadedUrls);
  document.head.appendChild(style);
}

/**
 * Clear all asset caches
 */
export function clearAssetCache(): void {
  // Revoke all blob URLs to free memory
  for (const url of assetCache.values()) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
  assetCache.clear();
  pendingLoads.clear();
}

/**
 * Get cached asset URL (without loading)
 */
export function getCachedAsset(url: string): string | undefined {
  return assetCache.get(url);
}

/**
 * Check if asset is cached
 */
export function isAssetCached(url: string): boolean {
  return assetCache.has(url);
}
