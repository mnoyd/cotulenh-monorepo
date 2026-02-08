import { getStoredValue, setStoredValue } from '$lib/stores/persisted.svelte';
import { COTULENH_LOCALES, createLocaleRegistry, translateKey } from '@cotulenh/i18n';
import type { Locale, TranslationKey, TranslationKeys } from './types';
import { en } from './locales/en';
import { vi } from './locales/vi';

export type { Locale, TranslationKey, TranslationKeys };

const LOCALE_STORAGE_KEY = 'cotulenh-locale';
const DEFAULT_LOCALE: Locale = 'vi';

const translations: Record<Locale, TranslationKeys> = {
  en,
  vi
};

const localeRegistry = createLocaleRegistry(COTULENH_LOCALES);

export const LOCALES = localeRegistry.locales;

function getInitialLocale(): Locale {
  const stored = getStoredValue<string>(LOCALE_STORAGE_KEY, DEFAULT_LOCALE);
  return localeRegistry.isValidLocale(stored) ? stored : DEFAULT_LOCALE;
}

export function createI18n() {
  let locale = $state<Locale>(getInitialLocale());

  function t(key: TranslationKey): string {
    return translateKey(translations, locale, key);
  }

  function setLocale(newLocale: Locale) {
    locale = newLocale;
    setStoredValue(LOCALE_STORAGE_KEY, newLocale);
  }

  function getLocale(): Locale {
    return locale;
  }

  return {
    get locale() {
      return locale;
    },
    t,
    setLocale,
    getLocale
  };
}

let i18nInstance: ReturnType<typeof createI18n> | null = null;

export function getI18n() {
  if (!i18nInstance) {
    i18nInstance = createI18n();
  }
  return i18nInstance;
}

export function t(key: TranslationKey): string {
  return getI18n().t(key);
}

export function setLocale(locale: Locale) {
  getI18n().setLocale(locale);
}

export function getLocale(): Locale {
  return getI18n().getLocale();
}
