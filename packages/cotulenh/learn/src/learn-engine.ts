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
import { Scenario } from './scenario';

/**
 * LearnEngine - Framework-agnostic learning session manager.
 *
 * Handles lesson state, move validation, goal checking, scoring, and scenarios.
 * UI frameworks should wrap this with their own reactive layer.
 */
export class LearnEngine {
  #lesson: Lesson | null = null;
  #status: LearnStatus = 'loading';
  #moveCount = 0;
  #game: CoTuLenh | null = null;
  #callbacks: LearnEngineCallbacks;
  #scenario: Scenario | null = null;
  #opponentMoveTimeout: ReturnType<typeof setTimeout> | null = null;

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
    const optimal = this.#lesson?.optimalMoves ?? this.#getDefaultOptimalMoves();
    return LearnEngine.calculateStars(this.#moveCount, optimal);
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

  get failureMessage(): string {
    return this.#lesson?.failureMessage ?? "That's not the right move. Try again!";
  }

  get game(): CoTuLenh | null {
    return this.#game;
  }

  get scenario(): Scenario | null {
    return this.#scenario;
  }

  /**
   * Check if this lesson uses a scenario
   */
  get hasScenario(): boolean {
    return this.#scenario !== null;
  }

  /**
   * Get default optimal moves based on scenario or lesson type
   */
  #getDefaultOptimalMoves(): number {
    if (this.#scenario) {
      return this.#scenario.playerMoveCount;
    }
    return 3; // Default for free-form lessons
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

    // Clear any pending opponent move
    this.#clearOpponentTimeout();

    this.#lesson = lesson;
    this.#moveCount = 0;
    this.#status = 'ready';

    // Initialize scenario if present
    if (lesson.scenario && lesson.scenario.length > 0) {
      this.#scenario = new Scenario(lesson.scenario, {
        onShapes: (shapes) => this.#callbacks.onShapes?.(shapes)
      });
    } else {
      this.#scenario = null;
    }

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
    if (this.#status !== 'ready') return false;

    const uci = Scenario.toUci(from, to);

    // Handle scenario-based lessons
    if (this.#scenario) {
      return this.#handleScenarioMove(from, to, uci);
    }

    // Handle free-form lessons (goal-based)
    return this.#handleFreeFormMove(from, to);
  }

  /**
   * Handle a move in a scenario-based lesson
   */
  #handleScenarioMove(from: Square, to: Square, uci: string): boolean {
    if (!this.#scenario || !this.#game) return false;

    const expectedMove = this.#scenario.expectedMove;

    // Validate move against scenario
    if (!this.#scenario.player(uci)) {
      // Wrong move
      this.#status = 'failed';
      this.#callbacks.onFail?.(expectedMove ?? '', uci);
      this.#callbacks.onStateChange?.(this.#status);
      return false;
    }

    // Correct move - execute it
    try {
      this.#game.move({ from, to }, { legal: false });
      this.#moveCount++;
    } catch (error) {
      logger.error('Move failed:', { error, from, to });
      return false;
    }

    this.#callbacks.onMove?.(this.#moveCount, this.fen);

    // Check if scenario is complete
    if (this.#scenario.isComplete) {
      this.#completeLesson();
      return true;
    }

    // Schedule opponent move if needed
    if (this.#scenario.shouldOpponentMove()) {
      this.#scheduleOpponentMove();
    }

    return true;
  }

  /**
   * Handle a move in a free-form (goal-based) lesson
   */
  #handleFreeFormMove(from: Square, to: Square): boolean {
    if (!this.#game) return false;

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
      this.#completeLesson();
    }

    return true;
  }

  /**
   * Schedule the opponent's move with a delay
   */
  #scheduleOpponentMove(): void {
    if (!this.#scenario) return;

    const opponentMove = this.#scenario.getOpponentMove();
    if (!opponentMove) return;

    this.#opponentMoveTimeout = setTimeout(() => {
      this.#executeOpponentMove(opponentMove);
    }, 500);
  }

  /**
   * Execute the opponent's move
   */
  #executeOpponentMove(move: { from: Square; to: Square }): void {
    if (!this.#game || !this.#scenario) return;

    try {
      this.#game.move({ from: move.from, to: move.to }, { legal: false });
      this.#scenario.confirmOpponentMove();

      const uci = Scenario.toUci(move.from, move.to);
      this.#callbacks.onOpponentMove?.(uci, this.fen);

      // Check if scenario is complete after opponent move
      if (this.#scenario.isComplete) {
        this.#completeLesson();
      }
    } catch (error) {
      logger.error('Opponent move failed:', { error, move });
    }
  }

  /**
   * Clear any pending opponent move timeout
   */
  #clearOpponentTimeout(): void {
    if (this.#opponentMoveTimeout) {
      clearTimeout(this.#opponentMoveTimeout);
      this.#opponentMoveTimeout = null;
    }
  }

  /**
   * Complete the lesson successfully
   */
  #completeLesson(): void {
    this.#status = 'completed';
    this.#callbacks.onStateChange?.(this.#status);
    this.#callbacks.onComplete?.(this.#getResult());
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

    this.#clearOpponentTimeout();
    this.#moveCount = 0;
    this.#status = 'ready';

    if (this.#scenario) {
      this.#scenario.reset();
    }

    try {
      this.#game = new CoTuLenh(this.#lesson.startFen);
      this.#callbacks.onStateChange?.(this.#status);
    } catch (error) {
      logger.error('Failed to restart lesson:', { error });
    }
  }

  undo(): boolean {
    if (!this.#game || this.#moveCount === 0) return false;

    // Undo not supported for scenario lessons
    if (this.#scenario) {
      return false;
    }

    this.#game.undo();
    this.#moveCount--;

    if (this.#status === 'completed' || this.#status === 'failed') {
      this.#status = 'ready';
      this.#callbacks.onStateChange?.(this.#status);
    }

    return true;
  }

  /**
   * Retry after failure (for scenario lessons)
   */
  retry(): void {
    this.restart();
  }

  // ============================================================
  // STATIC PROGRESS HELPERS
  // ============================================================

  /**
   * Calculate star rating from move count and optimal moves
   */
  static calculateStars(moveCount: number, optimalMoves: number = 3): 0 | 1 | 2 | 3 {
    if (moveCount <= optimalMoves) return 3;
    if (moveCount <= optimalMoves + Math.ceil(optimalMoves / 2)) return 2;
    if (moveCount <= optimalMoves * 2) return 1;
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
