import type { Locale } from '$lib/i18n/index.svelte';

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export interface PuzzleConfig {
  id: number;
  difficulty: PuzzleDifficulty;
  fen: string;
}

export interface PuzzleContent {
  title: string;
  description: string;
  hint?: string;
}

export type PuzzleContentMap = Record<number, PuzzleContent>;

export type PuzzleLocale = Locale;

export interface PuzzleView extends PuzzleConfig, PuzzleContent {}
