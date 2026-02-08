import { describe, expect, it } from 'vitest';
import { findMissingTranslationKeys } from '@cotulenh/i18n';
import { en } from './locales/en';
import { vi } from './locales/vi';

describe('app i18n parity', () => {
  it('has no missing keys between en and vi', () => {
    const missing = findMissingTranslationKeys({ en, vi });

    expect(missing.en).toEqual([]);
    expect(missing.vi).toEqual([]);
  });

  it('does not contain empty translations', () => {
    for (const [locale, dict] of Object.entries({ en, vi })) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim(), `${locale}:${key}`).not.toBe('');
      }
    }
  });
});
