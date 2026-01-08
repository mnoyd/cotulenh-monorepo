/**
 * Theme Store
 *
 * Svelte store wrapper for the theme controller.
 * Provides the same API as the previous complex theme system but uses
 * the simplified static CSS approach.
 */

import { browser } from '$app/environment';
import { themeController, type ThemeId, type ThemeInfo } from '$lib/themes/index.js';

export type { ThemeId, ThemeInfo };

/**
 * Re-export for backwards compatibility
 */
export interface ResolvedThemeConfig {
  meta: {
    id: ThemeId;
    name: string;
    description: string;
  };
}

function createThemeStore() {
  return {
    get current() {
      return themeController.current;
    },
    get currentConfig(): ResolvedThemeConfig | null {
      const theme = themeController.currentConfig;
      if (!theme) return null;
      return {
        meta: {
          id: theme.id,
          name: theme.name,
          description: theme.description
        }
      };
    },
    get isInitialized() {
      return themeController.isInitialized;
    },
    get isLoading() {
      return themeController.isLoading;
    },
    get error() {
      return null; // Errors are logged, not exposed
    },
    get themes(): ThemeInfo[] {
      return themeController.themes;
    },
    async setTheme(themeId: ThemeId): Promise<void> {
      await themeController.setTheme(themeId);
    },
    async init(): Promise<void> {
      await themeController.init();
    },
    cleanup(): void {
      // No cleanup needed for static CSS approach
    }
  };
}

export const themeStore = createThemeStore();

// Auto-initialize in browser
if (browser) {
  themeStore.init();
}
