import { logger } from '@cotulenh/common';
import { BITS, SQUARE_MAP } from '@cotulenh/core';
import type { Square, MoveResult, InternalMove, Piece } from '@cotulenh/core';
import type {
  Lesson,
  LessonProgress,
  LearnStatus,
  LearnEngineCallbacks,
  LessonResult,
  SquareInfo
} from './types';
import { getLessonById } from './lessons';
import { Scenario } from './scenario';
import { AntiRuleCore } from './anti-rule-core';
import { ValidatorFactory } from './validators/validator-factory';
import { CompletionFactory } from './completion/completion-factory';
import { GraderFactory } from './grading/grader-factory';
import { FeedbackFactory } from './feedback/feedback-factory';
import type { MoveValidator } from './validators/move-validator';
import type { CompletionChecker } from './completion/completion-checker';
import type { Grader } from './grading/grader';
import type { FeedbackProvider } from './feedback/feedback-provider';
import { CompositeValidator } from './validators/composite-validator';
import { TargetValidator } from './validators/target-validator';

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
  #game: AntiRuleCore | null = null;
  #callbacks: LearnEngineCallbacks;
  #scenario: Scenario | null = null;
  #opponentMoveTimeout: ReturnType<typeof setTimeout> | null = null;
  #visitedTargets: Set<Square> = new Set();
  #interactionCount = 0; // Tracks moves + selections

  // Component-based architecture
  #validator: MoveValidator | null = null;
  #completionChecker: CompletionChecker | null = null;
  #grader: Grader | null = null;
  #feedbackProvider: FeedbackProvider | null = null;

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
    if (this.#grader && this.#lesson) {
      const result = this.#grader.grade(this.#moveCount, this.#lesson);
      return result.stars;
    }
    // Fallback for backward compatibility
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

  get game(): AntiRuleCore | null {
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
   * Get the remaining target squares that haven't been visited yet
   */
  get remainingTargets(): Square[] {
    // Use TargetValidator if available
    if (this.#validator) {
      const targetValidator = this.#findTargetValidator();
      if (targetValidator) {
        return targetValidator.remainingTargets;
      }
    }
    // Fallback for backward compatibility
    const targets = this.#lesson?.targetSquares ?? [];
    return targets.filter((t) => !this.#visitedTargets.has(t));
  }

  /**
   * Get all visited target squares
   */
  get visitedTargets(): Square[] {
    // Use TargetValidator if available
    if (this.#validator) {
      const targetValidator = this.#findTargetValidator();
      if (targetValidator) {
        // TargetValidator doesn't expose visited targets directly,
        // calculate from total - remaining
        const allTargets = this.#lesson?.targetSquares ?? [];
        const remaining = targetValidator.remainingTargets;
        return allTargets.filter((t) => !remaining.includes(t));
      }
    }
    // Fallback for backward compatibility
    return Array.from(this.#visitedTargets);
  }

  /**
   * Helper to find TargetValidator in the validator chain
   */
  #findTargetValidator(): TargetValidator | null {
    if (!this.#validator) return null;

    // If it's a CompositeValidator, search for TargetValidator
    if (this.#validator instanceof CompositeValidator) {
      return this.#validator.findValidator(TargetValidator);
    }

    // If it's directly a TargetValidator
    if (this.#validator instanceof TargetValidator) {
      return this.#validator;
    }

    return null;
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
    return this.#game.moves({ verbose: true });
  }

  /**
   * Get information about a square for feedback purposes
   */
  getSquareInfo(square: Square): SquareInfo {
    const lesson = this.#lesson;
    const game = this.#game;

    const hasPiece = game?.get(square) !== undefined;
    const isTarget = lesson?.targetSquares?.includes(square) ?? false;

    // Check if square is a valid destination for any selected piece
    const moves = this.getPossibleMoves();
    const isValidDest = moves.some((m) => m.to === square);

    // Determine feedback message
    let message: string | null = null;

    // Priority 1: Custom message for this specific square
    if (lesson?.feedback?.onSelect?.[square]) {
      message = lesson.feedback.onSelect[square];
    }
    // Priority 2: Target square message
    else if (isTarget) {
      message = lesson?.feedback?.onTarget ?? 'Move here to complete the lesson!';
    }
    // Priority 3: Piece message (if clicking on movable piece)
    else if (hasPiece && moves.some((m) => m.from === square)) {
      message = lesson?.feedback?.onPiece ?? null;
    }

    return {
      square,
      hasPiece,
      isTarget,
      isValidDest,
      message
    };
  }

  /**
   * Handle square selection - call this from UI when a square is clicked
   */
  handleSelect(square: Square): SquareInfo {
    const info = this.getSquareInfo(square);
    this.#interactionCount++;
    this.#callbacks.onSelect?.(info);

    // Check if goal reached (useful for non-moving lessons like HQ)
    if (this.#checkGoalReached()) {
      this.#completeLesson();
    }

    return info;
  }

  get interactionCount(): number {
    return this.#interactionCount;
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
    this.#visitedTargets.clear();

    // Initialize scenario if present
    if (lesson.scenario && lesson.scenario.length > 0) {
      this.#scenario = new Scenario(lesson.scenario, {
        onShapes: (shapes) => this.#callbacks.onShapes?.(shapes)
      });
    } else {
      this.#scenario = null;
    }

    try {
      this.#game = new AntiRuleCore(lesson.startFen, { skipLastGuard: true });

      // Initialize components using factories
      this.#validator = ValidatorFactory.create(lesson, this);
      this.#completionChecker = CompletionFactory.create(lesson, [this.#validator]);
      this.#grader = GraderFactory.create(lesson);
      this.#feedbackProvider = FeedbackFactory.create(lesson);

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
  makeMove(from: Square, to: Square, stay?: boolean): boolean {
    if (!this.#lesson || !this.#game) return false;
    if (this.#status !== 'ready') return false;

    const uci = Scenario.toUci(from, to);

    // Handle scenario-based lessons
    if (this.#scenario) {
      return this.#handleScenarioMove(from, to, uci);
    }

    // Handle free-form lessons (goal-based)
    return this.#handleFreeFormMove(from, to, stay);
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
      this.#game.move({ from, to });
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
  #handleFreeFormMove(from: Square, to: Square, stay?: boolean): boolean {
    if (!this.#game) return false;

    const validation = this.#validateMove(from, to);
    if (!validation.valid) {
      return false;
    }

    try {
      this.#game.move({ from, to, ...(stay !== undefined && { stay }) });
      this.#moveCount++;
    } catch (error) {
      logger.error('Move failed:', { error, from, to });
      return false;
    }

    // Track if we landed on a target square
    if (this.#lesson?.targetSquares?.includes(to)) {
      this.#visitedTargets.add(to);
    }

    this.#callbacks.onMove?.(this.#moveCount, this.fen);

    // Check if goal reached
    if (this.#checkGoalReached()) {
      this.#completeLesson();
    }

    return true;
  }

  #validateMove(from: Square, to: Square): { valid: boolean } {
    if (!this.#lesson || !this.#game || !this.#validator) return { valid: true };

    const internalMove = this.#buildInternalMove(from, to);
    if (!internalMove) {
      return { valid: false };
    }

    const result = this.#validator.validate(internalMove, this.#game);
    if (!result.valid && result.feedbackData && this.#lesson.feedback && this.#feedbackProvider) {
      const messages = this.#lesson.feedback;
      switch (result.feedbackData.severity) {
        case 'error':
          this.#feedbackProvider.showError(result.feedbackData, messages);
          break;
        case 'warning':
          this.#feedbackProvider.showWarning(result.feedbackData, messages);
          break;
        case 'info':
          this.#feedbackProvider.showInfo(result.feedbackData, messages);
          break;
        default:
          break;
      }
    }

    return { valid: result.valid };
  }

  #buildInternalMove(from: Square, to: Square): InternalMove | null {
    if (!this.#game) return null;

    const piece = this.#game.get(from);
    if (!piece) return null;

    const captured = this.#game.get(to);

    return {
      color: piece.color,
      from: SQUARE_MAP[from],
      to: SQUARE_MAP[to],
      piece: piece as Piece,
      captured,
      flags: captured ? BITS.CAPTURE : BITS.NORMAL
    };
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
    }, this.#scenario.opponentDelay);
  }

  /**
   * Execute the opponent's move
   */
  #executeOpponentMove(move: { from: Square; to: Square }): void {
    if (!this.#game || !this.#scenario) return;

    try {
      this.#game.move({ from: move.from, to: move.to });
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
    // Use CompletionChecker if available
    if (this.#completionChecker) {
      return this.#completionChecker.check(this);
    }

    // Fallback for backward compatibility
    if (!this.#lesson || !this.#game) return false;

    // If targetSquares defined, check if all have been visited
    if (this.#lesson.targetSquares && this.#lesson.targetSquares.length > 0) {
      return this.#lesson.targetSquares.every((t) => this.#visitedTargets.has(t));
    }

    // Fall back to goalFen check
    if (!this.#lesson.goalFen) return false;

    const currentPosition = this.#normalizePositionFen(this.#game.fen());
    const goalPosition = this.#normalizePositionFen(this.#lesson.goalFen);

    return currentPosition === goalPosition;
  }

  /**
   * Extract and normalize the position part of FEN (before first space).
   * Removes the '+' heroic marker for comparison purposes.
   */
  #normalizePositionFen(fen: string): string {
    const position = fen.split(' ')[0];
    // Remove '+' heroic markers for comparison
    return position.replace(/\+/g, '');
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
    this.#interactionCount = 0;
    this.#status = 'ready';
    this.#visitedTargets.clear();

    if (this.#scenario) {
      this.#scenario.reset();
    }

    try {
      this.#game = new AntiRuleCore(this.#lesson.startFen, { skipLastGuard: true });
      this.#validator = ValidatorFactory.create(this.#lesson, this);
      this.#completionChecker = CompletionFactory.create(this.#lesson, [this.#validator]);
      this.#grader = GraderFactory.create(this.#lesson);
      this.#feedbackProvider = FeedbackFactory.create(this.#lesson);
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
