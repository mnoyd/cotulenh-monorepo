import type { Square } from '@cotulenh/core';

export type LessonCategory =
  | 'basics'
  | 'pieces'
  | 'terrain'
  | 'combining'
  | 'deployment'
  | 'tactics';

export interface LessonStep {
  /** FEN position for this step */
  fen: string;
  /** Instruction text shown to user */
  instruction: string;
  /** Expected move(s) - user must make one of these to progress */
  expectedMoves: { from: Square; to: Square }[];
  /** Hint text if user makes wrong move */
  hint?: string;
  /** Success message when correct move is made */
  successMessage?: string;
  /** If true, any legal move is accepted (for exploration) */
  freePlay?: boolean;
  /** Highlight these squares */
  highlights?: Square[];
  /** Arrows to draw on board */
  arrows?: { from: Square; to: Square; color?: string }[];
}

export interface Lesson {
  id: string;
  category: LessonCategory;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3;
  steps: LessonStep[];
}

export interface LessonProgress {
  lessonId: string;
  completedSteps: number;
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  mistakes: number;
}

export interface CategoryInfo {
  id: LessonCategory;
  title: string;
  description: string;
  icon: string;
  lessons: Lesson[];
}
