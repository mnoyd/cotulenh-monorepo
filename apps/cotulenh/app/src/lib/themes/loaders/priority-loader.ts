/**
 * Priority Asset Loader
 *
 * Loads theme assets in phases based on criticality:
 * - Critical: Blocks render (board background, most-used pieces)
 * - High: Load ASAP but non-blocking (remaining pieces)
 * - Low: Lazy load on demand (backgrounds, decorations)
 */

import type { ThemeAssets, ThemeId } from '../types.js';
import { loadAsset, isAssetCached } from '../asset-loader.js';

export type AssetPriority = 'critical' | 'high' | 'low';

/**
 * Get critical assets that should block initial render
 */
function getCriticalAssets(assets: ThemeAssets): string[] {
  const critical: string[] = [assets.board.background];

  // Most common pieces (infantry, tank are most used)
  if (assets.pieces.blue.infantry) critical.push(assets.pieces.blue.infantry);
  if (assets.pieces.red.infantry) critical.push(assets.pieces.red.infantry);
  if (assets.pieces.blue.tank) critical.push(assets.pieces.blue.tank);
  if (assets.pieces.red.tank) critical.push(assets.pieces.red.tank);

  // Heroic star (important for visual feedback)
  if (assets.pieces.heroic) critical.push(assets.pieces.heroic);

  return critical.filter(Boolean);
}

/**
 * Get high priority assets (load ASAP but non-blocking)
 */
function getHighPriorityAssets(assets: ThemeAssets): string[] {
  const high: string[] = [];

  // Remaining piece types
  const criticalRoles = ['infantry', 'tank'];

  for (const [role, url] of Object.entries(assets.pieces.blue)) {
    if (!criticalRoles.includes(role) && url) {
      high.push(url);
    }
  }
  for (const [role, url] of Object.entries(assets.pieces.red)) {
    if (!criticalRoles.includes(role) && url) {
      high.push(url);
    }
  }

  return high;
}

/**
 * Get low priority assets (lazy load)
 */
function getLowPriorityAssets(assets: ThemeAssets): string[] {
  const low: string[] = [];

  // Background images and overlays
  if (assets.board.overlay) low.push(assets.board.overlay);
  if (assets.background?.image) low.push(assets.background.image);
  if (assets.background?.pattern) low.push(assets.background.pattern);

  return low.filter(Boolean);
}

/**
 * Load assets by priority level
 *
 * @param themeId - Theme ID (for logging)
 * @param assets - Theme assets configuration
 * @param priority - Priority level to load
 */
export async function loadAssetsByPriority(
  themeId: ThemeId,
  assets: ThemeAssets,
  priority: AssetPriority
): Promise<void> {
  let urls: string[];

  switch (priority) {
    case 'critical':
      urls = getCriticalAssets(assets);
      break;
    case 'high':
      urls = getHighPriorityAssets(assets);
      break;
    case 'low':
      urls = getLowPriorityAssets(assets);
      break;
  }

  // Filter out already cached assets
  const uncached = urls.filter((url) => !isAssetCached(url));

  if (uncached.length === 0) return;

  // Load all uncached assets in parallel
  await Promise.all(
    uncached.map((url) =>
      loadAsset(url).catch((err) => {
        console.warn(`[Theme:${themeId}] Failed to load ${priority} asset:`, url, err);
      })
    )
  );
}

/**
 * Load theme assets in phases
 *
 * @param themeId - Theme ID
 * @param assets - Theme assets configuration
 * @param options - Loading options
 */
export async function loadThemeAssetsPhased(
  themeId: ThemeId,
  assets: ThemeAssets,
  options: { blockOnCritical?: boolean } = {}
): Promise<void> {
  const { blockOnCritical = true } = options;

  // Phase 1: Critical assets (may block)
  if (blockOnCritical) {
    await loadAssetsByPriority(themeId, assets, 'critical');
  } else {
    loadAssetsByPriority(themeId, assets, 'critical');
  }

  // Phase 2: High priority (non-blocking, uses idle callback)
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      loadAssetsByPriority(themeId, assets, 'high');
    });
  } else {
    setTimeout(() => {
      loadAssetsByPriority(themeId, assets, 'high');
    }, 100);
  }

  // Phase 3: Low priority (lazy, further delayed)
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(
      () => {
        loadAssetsByPriority(themeId, assets, 'low');
      },
      { timeout: 2000 }
    );
  } else {
    setTimeout(() => {
      loadAssetsByPriority(themeId, assets, 'low');
    }, 1000);
  }
}

/**
 * Get loading progress for a theme
 */
export function getAssetLoadingProgress(assets: ThemeAssets): {
  critical: { loaded: number; total: number };
  high: { loaded: number; total: number };
  low: { loaded: number; total: number };
  overall: number;
} {
  const critical = getCriticalAssets(assets);
  const high = getHighPriorityAssets(assets);
  const low = getLowPriorityAssets(assets);

  const criticalLoaded = critical.filter(isAssetCached).length;
  const highLoaded = high.filter(isAssetCached).length;
  const lowLoaded = low.filter(isAssetCached).length;

  const total = critical.length + high.length + low.length;
  const loaded = criticalLoaded + highLoaded + lowLoaded;

  return {
    critical: { loaded: criticalLoaded, total: critical.length },
    high: { loaded: highLoaded, total: high.length },
    low: { loaded: lowLoaded, total: low.length },
    overall: total > 0 ? loaded / total : 1
  };
}
