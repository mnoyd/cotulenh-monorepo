import type { Square, InternalMove } from '@cotulenh/core';
import type { LearnEngine } from './learn-engine';

export type FeedbackCode =
  | 'success.default'
  | 'failure.default'
  | 'hint.moveToTarget'
  | 'hint.pieceSelected'
  | 'error.invalidMove'
  | 'error.wrongScenarioMove';

export type SubjectId = string;
export type SectionId = string;

export type LessonCategory =
  | 'basics'
  | 'pieces'
  | 'heroic'
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
 * Feedback data for validation errors
 */
export interface FeedbackData {
  type: 'terrain' | 'capture' | 'stacking' | 'air-defense' | 'scenario' | 'generic';
  severity: 'error' | 'warning' | 'info';
  code: string;
  context: Record<string, unknown>;
}

/**
 * Move validation result
 */
export interface MoveValidationResult {
  valid: boolean;
  feedbackData?: FeedbackData;
}

/**
 * Feedback messages for different error types
 */
export interface LessonFeedback {
  terrain?: Record<string, string>;
  capture?: Record<string, string>;
  stacking?: Record<string, string>;
  airDefense?: Record<string, string>;
  scenario?: Record<string, string>;
  targets?: Record<string, string>;
  generic?: Record<string, string>;
}

/**
 * Feedback style configuration
 */
export type FeedbackStyle = 'silent' | 'toast' | 'modal' | 'inline';

/**
 * Grading system type
 */
export type GradingSystem = 'none' | 'pass-fail' | 'stars';

/**
 * Goal-based lesson: user makes any legal moves until reaching goalFen
 */
export interface Lesson {
  id: string;
  category: LessonCategory;

  /** Parent subject (for new structure) */
  subjectId?: SubjectId;
  /** Parent section (for new structure) */
  sectionId?: SectionId;

  title: string;
  description: string;
  difficulty: 1 | 2 | 3;

  /** Starting position FEN */
  startFen: string;
  /** Target position FEN - lesson complete when board matches this (optional if using scenario) */
  goalFen?: string;
  /** Instruction text shown to user */
  instruction: string;
  /** Rich markdown content for lesson explanation (displayed above instruction) */
  content?: string;
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
  /** Optional: target destination square(s) to highlight for learning */
  targetSquares?: Square[];
  /** Whether targets must be visited in order */
  orderedTargets?: boolean;

  /**
   * Optional feedback messages for interactive hints
   */
  feedback?: LessonFeedback;

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

  // Validation configuration
  /** Validate basic move legality (default: false) */
  validateLegality?: boolean;
  /** Validate terrain restrictions (default: false) */
  validateTerrain?: boolean;
  /** Require exact scenario sequence (default: false) */
  strictScenario?: boolean;

  // Feedback configuration
  /** How to display feedback */
  feedbackStyle?: FeedbackStyle;

  // Grading configuration
  /** How to grade performance */
  grading?: GradingSystem;

  // UI configuration
  /** Allow undo (default: true) */
  allowUndo?: boolean;
  /** Allow hints (default: true) */
  allowHints?: boolean;
  /** Show move count (default: false) */
  showMoveCount?: boolean;
  /** Show valid moves highlight (default: true) */
  showValidMoves?: boolean;

  // Custom validators
  /** Custom completion checker */
  customCompletion?: (engine: LearnEngine) => boolean;
  /** Custom move validator (return error message or null) */
  customMoveValidator?: (move: InternalMove, engine: LearnEngine) => string | null;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  /** Number of moves used to complete */
  moveCount: number;
  stars: 0 | 1 | 2 | 3;
}

export type LearnStatus = 'loading' | 'ready' | 'completed' | 'failed';

/**
 * Callback interface for LearnEngine events
 */
/**
 * Information about a selected square for feedback
 */
export interface SquareInfo {
  square: Square;
  /** Whether this square has a piece that can move */
  hasPiece: boolean;
  /** Whether this is a target square for the lesson */
  isTarget: boolean;
  /** Whether this square is a valid destination for the selected piece */
  isValidDest: boolean;
  /** Feedback code for i18n lookup */
  feedbackCode: FeedbackCode | null;
  /** Additional context for feedback message interpolation */
  feedbackContext?: Record<string, unknown>;
}

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
  /** Called when a square is selected/clicked */
  onSelect?: (info: SquareInfo) => void;
}

export interface LessonResult {
  lessonId: string;
  moveCount: number;
  stars: 0 | 1 | 2 | 3;
  completed: boolean;
}

/**
 * Subject - top-level learning unit
 */
export interface Subject {
  id: SubjectId;
  title: string;
  description: string;
  icon: string;
  /** Markdown introduction/walkthrough */
  introduction: string;
  /** Subject IDs that must be completed before this unlocks */
  prerequisites: SubjectId[];
  /** Sections within this subject */
  sections: Section[];
}

/**
 * Section - group of related lessons within a subject
 */
export interface Section {
  id: SectionId;
  title: string;
  description: string;
  /** Optional section introduction */
  introduction?: string;
  /** Lessons in this section */
  lessons: Lesson[];
}

/**
 * Subject progress tracking
 */
export interface SubjectProgress {
  subjectId: SubjectId;
  completed: boolean;
  /** Section completion map */
  sections: Record<SectionId, boolean>;
  /** Overall progress percentage (0-100) */
  progress: number;
}
