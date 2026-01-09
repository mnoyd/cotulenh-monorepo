/**
 * Theme Controller
 *
 * Simplified theme management using static CSS files and <link> tag swapping.
 * Inspired by MonkeyType's clean approach.
 */

import { browser } from '$app/environment';

export type ThemeId = 'modern-warfare' | 'classic' | 'forest';

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
}

/**
 * Available themes metadata
 */
export const themes: ThemeInfo[] = [
  {
    id: 'modern-warfare',
    name: 'Modern Warfare',
    description: 'Tactical HUD with cyan/amber accents',
    isDark: true
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional warm wood tones',
    isDark: true
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green military aesthetic',
    isDark: true
  }
];

const STORAGE_KEY = 'cotulenh_theme';
const DEFAULT_THEME: ThemeId = 'modern-warfare';
const LINK_ID = 'theme-stylesheet';

function createThemeController() {
  let currentId = $state<ThemeId>(DEFAULT_THEME);
  let isLoading = $state(false);
  let isInitialized = $state(false);

  /**
   * Load theme CSS by swapping <link> tag href
   */
  function loadCSS(id: ThemeId): Promise<void> {
    if (!browser) return Promise.resolve();

    return new Promise((resolve) => {
      isLoading = true;

      let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
      const newHref = `/themes/${id}/${id}.css`;

      // If already loaded, just resolve
      if (link?.getAttribute('href') === newHref) {
        isLoading = false;
        resolve();
        return;
      }

      if (!link) {
        link = document.createElement('link');
        link.id = LINK_ID;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }

      const handleLoad = () => {
        isLoading = false;
        link?.removeEventListener('load', handleLoad);
        link?.removeEventListener('error', handleError);
        resolve();
      };

      const handleError = () => {
        isLoading = false;
        link?.removeEventListener('load', handleLoad);
        link?.removeEventListener('error', handleError);
        console.error(`Failed to load theme: ${id}`);
        resolve();
      };

      link.addEventListener('load', handleLoad);
      link.addEventListener('error', handleError);
      link.href = newHref;
    });
  }

  /**
   * Set the current theme
   */
  async function setTheme(id: ThemeId): Promise<void> {
    if (!themes.find((t) => t.id === id)) {
      console.warn(`Attempted to set unknown theme: ${id}`);
      return;
    }

    currentId = id;

    if (browser) {
      localStorage.setItem(STORAGE_KEY, id);
      document.documentElement.dataset.theme = id;
      await loadCSS(id);
    }
  }

  /**
   * Initialize the theme system
   */
  async function init(): Promise<void> {
    if (!browser || isInitialized) return;

    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const validTheme = stored && themes.find((t) => t.id === stored) ? stored : DEFAULT_THEME;

    isInitialized = true;
    await setTheme(validTheme);
  }

  /**
   * Get theme info by ID
   */
  function getTheme(id: ThemeId): ThemeInfo | undefined {
    return themes.find((t) => t.id === id);
  }

  return {
    get current() {
      return currentId;
    },
    get currentConfig() {
      return getTheme(currentId);
    },
    get isLoading() {
      return isLoading;
    },
    get isInitialized() {
      return isInitialized;
    },
    get themes() {
      return themes;
    },
    setTheme,
    init,
    getTheme
  };
}

export const themeController = createThemeController();
