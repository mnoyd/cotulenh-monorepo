import { browser } from '$app/environment';
import { logger } from '@cotulenh/common';

/**
 * Creates a persisted Svelte 5 state that syncs with localStorage.
 *
 * @param key - The localStorage key
 * @param initialValue - Default value if nothing in localStorage
 * @returns A reactive state object with get/set/subscribe
 *
 * @example
 * const theme = persisted('theme', 'dark');
 * console.log(theme.value); // Read
 * theme.value = 'light';    // Write (auto-saves to localStorage)
 */
export function persisted<T>(key: string, initialValue: T) {
  // Load initial value from localStorage
  const stored = browser ? localStorage.getItem(key) : null;
  let value = $state<T>(stored ? tryParse(stored, initialValue) : initialValue);

  // Save to localStorage on changes
  $effect(() => {
    if (browser) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        logger.error(error, `Failed to save to localStorage: ${key}`);
      }
    }
  });

  return {
    get value() {
      return value;
    },
    set value(newValue: T) {
      value = newValue;
    },
    /**
     * Clear this item from localStorage and reset to initial value
     */
    clear() {
      if (browser) {
        localStorage.removeItem(key);
      }
      value = initialValue;
    }
  };
}

/**
 * Try to parse JSON, return fallback on error
 */
function tryParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Read-only access to a localStorage value without reactivity.
 * Useful for one-time reads like loading report data.
 */
export function getStoredValue<T>(key: string, fallback: T): T {
  if (!browser) return fallback;
  const stored = localStorage.getItem(key);
  return stored ? tryParse(stored, fallback) : fallback;
}

/**
 * Set a localStorage value without reactivity.
 * Useful for one-time saves like storing report data.
 */
export function setStoredValue<T>(key: string, value: T): void {
  if (!browser) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.error(error, `Failed to save to localStorage: ${key}`);
  }
}
