import { CoTuLenh } from '@cotulenh/core';
import { logger } from '@cotulenh/common';
import type { Square, MoveResult } from '@cotulenh/core';
import type {
  Lesson,
  LessonProgress,
  LearnStatus,
  LearnEngineCallbacks,
  LessonResult
} from './types';
import { getLessonById } from './lessons';

/**
 * LearnEngine - Framework-agnostic learning session manager.
 *
 * Handles lesson state, move validation, goal checking, and scoring.
 * UI frameworks should wrap this with their own reactive layer.
 */
export class LearnEngine {
  #lesson: Lesson | null = null;
  #status: LearnStatus = 'loading';
  #moveCount = 0;
  #game: CoTuLenh | null = null;
  #callbacks: LearnEngineCallbacks;

  constructor(callbacks: LearnEngineCallbacks = {}) {
    this.#callbacks = callbacks;
  }

  // ============================================================
  // GETTERS
  // ============================================================

  get lesson(): Lesson | null {
    return this.#lesson;
  }

  get status(): LearnStatus {
    return this.#status;
  }

  get moveCount(): number {
    return this.#moveCount;
  }

  get fen(): string {
    return this.#game?.fen() ?? this.#lesson?.startFen ?? '';
  }

  get stars(): 0 | 1 | 2 | 3 {
    if (this.#moveCount <= 1) return 3;
    if (this.#moveCount <= 3) return 2;
    if (this.#moveCount <= 5) return 1;
    return 0;
  }

  get instruction(): string {
    return this.#lesson?.instruction ?? '';
  }

  get hint(): string {
    return this.#lesson?.hint ?? '';
  }

  get successMessage(): string {
    return this.#lesson?.successMessage ?? 'Well done!';
  }

  get game(): CoTuLenh | null {
    return this.#game;
  }

  /**
   * Get all possible moves for the current position
   */
  getPossibleMoves(): MoveResult[] {
    if (!this.#game) return [];
    return this.#game.moves({ verbose: true, legal: false }) as MoveResult[];
  }

  // ============================================================
  // LESSON MANAGEMENT
  // ============================================================

  loadLesson(lessonId: string): boolean {
    const lesson = getLessonById(lessonId);
    if (!lesson) {
      logger.error('Lesson not found:', { lessonId });
      return false;
    }

    this.#lesson = lesson;
    this.#moveCount = 0;
    this.#status = 'ready';

    try {
      this.#game = new CoTuLenh(lesson.startFen);
      this.#callbacks.onStateChange?.(this.#status);
    } catch (error) {
      logger.error('Failed to load lesson FEN:', { error, fen: lesson.startFen });
      return false;
    }

    return true;
  }

  /**
   * Make a move on the board
   * Returns true if the move was successful
   */
  makeMove(from: Square, to: Square): boolean {
    if (!this.#lesson || !this.#game) return false;

    try {
      this.#game.move({ from, to }, { legal: false });
      this.#moveCount++;
    } catch (error) {
      logger.error('Move failed:', { error, from, to });
      return false;
    }

    this.#callbacks.onMove?.(this.#moveCount, this.fen);

    // Check if goal reached
    if (this.#checkGoalReached()) {
      this.#status = 'completed';
      this.#callbacks.onStateChange?.(this.#status);
      this.#callbacks.onComplete?.(this.#getResult());
    }

    return true;
  }

  #checkGoalReached(): boolean {
    if (!this.#lesson || !this.#game) return false;

    const currentPosition = this.#extractPositionFen(this.#game.fen());
    const goalPosition = this.#extractPositionFen(this.#lesson.goalFen);

    return currentPosition === goalPosition;
  }

  /**
   * Extract only the position part of FEN (before first space)
   */
  #extractPositionFen(fen: string): string {
    return fen.split(' ')[0];
  }

  #getResult(): LessonResult {
    return {
      lessonId: this.#lesson?.id ?? '',
      moveCount: this.#moveCount,
      stars: this.stars,
      completed: true
    };
  }

  restart(): void {
    if (!this.#lesson) return;

    this.#moveCount = 0;
    this.#status = 'ready';

    try {
      this.#game = new CoTuLenh(this.#lesson.startFen);
      this.#callbacks.onStateChange?.(this.#status);
    } catch (error) {
      logger.error('Failed to restart lesson:', { error });
    }
  }

  undo(): boolean {
    if (!this.#game || this.#moveCount === 0) return false;

    this.#game.undo();
    this.#moveCount--;

    if (this.#status === 'completed') {
      this.#status = 'ready';
      this.#callbacks.onStateChange?.(this.#status);
    }

    return true;
  }

  // ============================================================
  // STATIC PROGRESS HELPERS
  // ============================================================

  /**
   * Calculate star rating from move count
   */
  static calculateStars(moveCount: number): 0 | 1 | 2 | 3 {
    if (moveCount <= 1) return 3;
    if (moveCount <= 3) return 2;
    if (moveCount <= 5) return 1;
    return 0;
  }

  /**
   * Create a progress record from a lesson result
   */
  static createProgress(result: LessonResult): LessonProgress {
    return {
      lessonId: result.lessonId,
      completed: result.completed,
      moveCount: result.moveCount,
      stars: result.stars
    };
  }
}

export function createLearnEngine(callbacks?: LearnEngineCallbacks): LearnEngine {
  return new LearnEngine(callbacks);
}
