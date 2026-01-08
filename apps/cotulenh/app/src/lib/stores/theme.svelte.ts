import { browser } from '$app/environment';

export type ThemeId = 'modern-warfare' | 'classic' | 'forest';

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  description: string;
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'modern-warfare',
    name: 'Modern Warfare',
    description: 'Tactical HUD with cyan/amber accents'
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional warm wood tones'
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green military aesthetic'
  }
];

const STORAGE_KEY = 'cotulenh_theme';
const DEFAULT_THEME: ThemeId = 'modern-warfare';

function createThemeStore() {
  let current = $state<ThemeId>(DEFAULT_THEME);

  function loadFromStorage(): ThemeId {
    if (!browser) return DEFAULT_THEME;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.some((t) => t.id === saved)) {
      return saved as ThemeId;
    }
    return DEFAULT_THEME;
  }

  function applyTheme(themeId: ThemeId) {
    if (!browser) return;

    // Remove all theme classes
    THEMES.forEach((t) => document.documentElement.classList.remove(`theme-${t.id}`));

    // Add new theme class
    document.documentElement.classList.add(`theme-${themeId}`);
  }

  function setTheme(themeId: ThemeId) {
    current = themeId;
    if (browser) {
      localStorage.setItem(STORAGE_KEY, themeId);
      applyTheme(themeId);
    }
  }

  function init() {
    if (!browser) return;

    current = loadFromStorage();
    applyTheme(current);
  }

  return {
    get current() {
      return current;
    },
    get themes() {
      return THEMES;
    },
    setTheme,
    init
  };
}

export const themeStore = createThemeStore();
