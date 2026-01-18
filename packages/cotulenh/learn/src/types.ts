import type { Square } from '@cotulenh/core';

export type LessonCategory =
  | 'basics'
  | 'pieces'
  | 'terrain'
  | 'combining'
  | 'deployment'
  | 'tactics';

/**
 * A move in UCI format (e.g., "e2e4", "g1f3")
 */
export type Uci = string;

/**
 * A single step in a scenario - either a simple move or a move with visual hints
 */
export type ScenarioStep =
  | Uci
  | {
      move: Uci;
      /** Arrows to show after this move */
      shapes?: { from: Square; to: Square; color?: string }[];
    };

/**
 * A scenario is an array of alternating player/opponent moves.
 * Player moves are at even indices (0, 2, 4, ...)
 * Opponent moves are at odd indices (1, 3, 5, ...)
 */
export type ScenarioBlueprint = ScenarioStep[];

/**
 * Arrow/shape for board visualization
 */
export interface BoardShape {
  from: Square;
  to: Square;
  color?: string;
}

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
  /** Failure message when wrong move is made (for scenario lessons) */
  failureMessage?: string;

  /** Optional: highlight these squares */
  highlightSquares?: Square[];
  /** Optional: arrows to draw on board */
  arrows?: BoardShape[];

  /**
   * Optional scenario: scripted sequence of moves.
   * If provided, user must follow this exact sequence.
   * Odd-indexed moves are played by the opponent automatically.
   */
  scenario?: ScenarioBlueprint;

  /**
   * Optimal number of moves to complete the lesson (for star calculation).
   * If not provided, defaults based on scenario length or a fixed value.
   */
  optimalMoves?: number;
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

export type LearnStatus = 'loading' | 'ready' | 'completed' | 'failed';

/**
 * Callback interface for LearnEngine events
 */
export interface LearnEngineCallbacks {
  onMove?: (moveCount: number, fen: string) => void;
  onComplete?: (result: LessonResult) => void;
  onStateChange?: (status: LearnStatus) => void;
  /** Called when scenario opponent makes a move */
  onOpponentMove?: (move: string, fen: string) => void;
  /** Called when player makes wrong move in scenario */
  onFail?: (expectedMove: string, actualMove: string) => void;
  /** Called when shapes should be displayed */
  onShapes?: (shapes: BoardShape[]) => void;
}

export interface LessonResult {
  lessonId: string;
  moveCount: number;
  stars: 0 | 1 | 2 | 3;
  completed: boolean;
}
