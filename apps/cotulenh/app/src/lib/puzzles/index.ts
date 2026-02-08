import { PUZZLE_CATALOG } from './catalog';
import { enPuzzles } from './locales/en';
import { viPuzzles } from './locales/vi';
import type { PuzzleContentMap, PuzzleLocale, PuzzleView } from './types';

const puzzleLocales: Record<PuzzleLocale, PuzzleContentMap> = {
  en: enPuzzles,
  vi: viPuzzles
};

export function getPuzzles(locale: PuzzleLocale): PuzzleView[] {
  const localizedContent = puzzleLocales[locale] ?? puzzleLocales.en;

  return PUZZLE_CATALOG.map((puzzle) => {
    const content = localizedContent[puzzle.id] ?? enPuzzles[puzzle.id];

    if (!content) {
      return {
        ...puzzle,
        title: `Puzzle ${puzzle.id}`,
        description: '',
        hint: undefined
      };
    }

    return {
      ...puzzle,
      ...content
    };
  });
}

export type { PuzzleDifficulty, PuzzleView } from './types';
