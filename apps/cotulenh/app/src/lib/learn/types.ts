import type { Square } from '@cotulenh/core';

export type LessonCategory =
  | 'basics'
  | 'pieces'
  | 'terrain'
  | 'combining'
  | 'deployment'
  | 'tactics';

/**
 * Goal-based lesson: user makes any legal moves until reaching goalFen
 */
export interface Lesson {
  id: string;
  category: LessonCategory;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3;

  /** Starting position FEN */
  startFen: string;
  /** Target position FEN - lesson complete when board matches this */
  goalFen: string;
  /** Instruction text shown to user */
  instruction: string;
  /** Hint text (shown on button press) */
  hint?: string;
  /** Success message when goal is reached */
  successMessage?: string;

  /** Optional: highlight these squares */
  highlightSquares?: Square[];
  /** Optional: arrows to draw on board */
  arrows?: { from: Square; to: Square; color?: string }[];
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  /** Number of moves used to complete */
  moveCount: number;
  stars: 0 | 1 | 2 | 3;
}

export interface CategoryInfo {
  id: LessonCategory;
  title: string;
  description: string;
  icon: string;
  lessons: Lesson[];
}
