import { describe, expect, it } from 'vitest';
import { PUZZLE_CATALOG } from './catalog';
import { enPuzzles } from './locales/en';
import { viPuzzles } from './locales/vi';

describe('puzzle i18n parity', () => {
  it('has localized content for every puzzle in catalog', () => {
    for (const puzzle of PUZZLE_CATALOG) {
      expect(enPuzzles[puzzle.id], `en missing puzzle ${puzzle.id}`).toBeDefined();
      expect(viPuzzles[puzzle.id], `vi missing puzzle ${puzzle.id}`).toBeDefined();
    }
  });

  it('does not define extra puzzle translations not in catalog', () => {
    const catalogIds = new Set(PUZZLE_CATALOG.map((puzzle) => puzzle.id));

    for (const id of Object.keys(enPuzzles).map(Number)) {
      expect(catalogIds.has(id), `en has unknown puzzle id ${id}`).toBe(true);
    }

    for (const id of Object.keys(viPuzzles).map(Number)) {
      expect(catalogIds.has(id), `vi has unknown puzzle id ${id}`).toBe(true);
    }
  });

  it('does not contain empty localized fields', () => {
    for (const [locale, map] of Object.entries({ en: enPuzzles, vi: viPuzzles })) {
      for (const [id, content] of Object.entries(map)) {
        expect(content.title.trim(), `${locale}:${id}:title`).not.toBe('');
        expect(content.description.trim(), `${locale}:${id}:description`).not.toBe('');
        if (content.hint !== undefined) {
          expect(content.hint.trim(), `${locale}:${id}:hint`).not.toBe('');
        }
      }
    }
  });
});
