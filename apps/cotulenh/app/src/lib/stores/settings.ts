import { z } from 'zod';
import { browser } from '$app/environment';
import { logger } from '@cotulenh/common';

const THEME_IDS = ['modern-warfare', 'classic', 'forest'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const SettingsSchema = z.object({
  soundsEnabled: z.boolean().default(true),
  soundVolume: z.number().min(0).max(1).default(0.5),
  showMoveHints: z.boolean().default(true),
  confirmReset: z.boolean().default(true),
  showDeployButtons: z.boolean().default(true),
  autoCompleteDeploy: z.boolean().default(true),
  theme: z.enum(THEME_IDS).default('modern-warfare')
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  soundsEnabled: true,
  soundVolume: 0.5,
  showMoveHints: true,
  confirmReset: true,
  showDeployButtons: true,
  autoCompleteDeploy: true,
  theme: 'modern-warfare'
};

const STORAGE_KEY = 'cotulenh_settings';

export function loadSettings(): Settings {
  if (!browser) return DEFAULT_SETTINGS;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(stored);
    const result = SettingsSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    logger.warn('Settings validation failed, using defaults', { issues: result.error.issues });
    return DEFAULT_SETTINGS;
  } catch (e) {
    logger.error(e instanceof Error ? e : new Error(String(e)), 'Failed to parse settings JSON');
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<Settings>): Settings {
  if (!browser) return DEFAULT_SETTINGS;

  const current = loadSettings();
  const merged = { ...current, ...settings };

  const result = SettingsSchema.safeParse(merged);
  if (!result.success) {
    logger.error('Invalid settings, not saving', { issues: result.error.issues });
    return current;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
    return result.data;
  } catch (e) {
    logger.error(e instanceof Error ? e : new Error(String(e)), 'Failed to save settings');
    return current;
  }
}

export function resetSettings(): Settings {
  if (browser) {
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_SETTINGS;
}
