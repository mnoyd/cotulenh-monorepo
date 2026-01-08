/**
 * Theme Store (v2)
 *
 * Enhanced theme store with lazy loading, asset preloading, and theme prefetching.
 * Uses the new comprehensive theme system with inheritance support.
 */

import { browser } from '$app/environment';
import {
  initThemes,
  applyTheme,
  cleanupThemes,
  getAllThemesInfo,
  canLoadTheme,
  type ThemeId,
  type ResolvedThemeConfig
} from '$lib/themes/index.js';

export type { ThemeId, ResolvedThemeConfig };

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  description: string;
}

const STORAGE_KEY = 'cotulenh_theme';
const DEFAULT_THEME: ThemeId = 'modern-warfare';

/**
 * Theme usage history for prediction
 */
const usageHistory: ThemeId[] = [];
const MAX_HISTORY = 10;

/**
 * Record theme usage for smart prefetching
 */
function recordUsage(themeId: ThemeId): void {
  usageHistory.push(themeId);
  if (usageHistory.length > MAX_HISTORY) {
    usageHistory.shift();
  }
}

/**
 * Predict which theme user might switch to next
 */
function predictNextTheme(currentTheme: ThemeId): ThemeId | null {
  // If user has toggled between two themes, predict the other
  const filtered = usageHistory.filter((t) => t !== currentTheme);
  if (filtered.length > 0) {
    // Return most recently used different theme
    return filtered[filtered.length - 1];
  }
  return null;
}

function createThemeStore() {
  let current = $state<ThemeId>(DEFAULT_THEME);
  let currentConfig = $state<ResolvedThemeConfig | null>(null);
  let isInitialized = $state(false);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  /**
   * Load theme preference from storage
   */
  function loadFromStorage(): ThemeId {
    if (!browser) return DEFAULT_THEME;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && canLoadTheme(saved as ThemeId)) {
      return saved as ThemeId;
    }
    return DEFAULT_THEME;
  }

  /**
   * Apply theme to DOM (classes and CSS injection)
   */
  async function applyThemeToDOM(themeId: ThemeId): Promise<ResolvedThemeConfig | null> {
    if (!browser) return null;

    // Remove all theme classes
    const allThemes = getAllThemesInfo();
    allThemes.forEach((t) => document.documentElement.classList.remove(`theme-${t.id}`));

    // Add new theme class
    document.documentElement.classList.add(`theme-${themeId}`);

    // Apply theme (loads, resolves inheritance, injects CSS, preloads assets)
    isLoading = true;
    error = null;

    try {
      const resolved = await applyTheme(themeId);
      currentConfig = resolved;

      // Schedule prefetch of predicted next theme
      const predicted = predictNextTheme(themeId);
      if (predicted && typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          // Just trigger the loader, don't wait
          import('$lib/themes/index.js').then(({ loadTheme }) => {
            loadTheme(predicted).catch(() => {
              // Ignore prefetch errors
            });
          });
        });
      }

      return resolved;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to apply theme';
      console.error(`Failed to apply theme ${themeId}:`, err);
      return null;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Set the current theme
   */
  async function setTheme(themeId: ThemeId): Promise<void> {
    if (current === themeId && isInitialized && currentConfig) return;

    recordUsage(themeId);
    current = themeId;

    if (browser) {
      localStorage.setItem(STORAGE_KEY, themeId);
      await applyThemeToDOM(themeId);
    }
  }

  /**
   * Initialize the theme system
   */
  async function init(): Promise<void> {
    if (!browser || isInitialized) return;

    const savedTheme = loadFromStorage();

    // Initialize theme system (loads base theme)
    await initThemes(savedTheme);

    current = savedTheme;
    isInitialized = true;
  }

  /**
   * Get all available themes
   */
  function getThemes(): ThemeInfo[] {
    return getAllThemesInfo();
  }

  /**
   * Clean up resources
   */
  function cleanup(): void {
    cleanupThemes();
    currentConfig = null;
  }

  return {
    get current() {
      return current;
    },
    get currentConfig() {
      return currentConfig;
    },
    get isInitialized() {
      return isInitialized;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get themes() {
      return getThemes();
    },
    setTheme,
    init,
    cleanup
  };
}

export const themeStore = createThemeStore();

// Auto-initialize in browser
if (browser) {
  themeStore.init();
}
