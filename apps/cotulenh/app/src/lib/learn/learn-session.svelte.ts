import type { Api, Config, OrigMove, DestMove } from '@cotulenh/board';
import type { Square } from '@cotulenh/core';
import {
  LearnEngine,
  type Lesson,
  type LessonProgress,
  type LearnStatus,
  type LearnLocale,
  type BoardShape,
  type SquareInfo,
  type GradingSystem,
  HintSystem,
  type HintLevel,
  translateLesson,
  setLearnLocale
} from '@cotulenh/learn';
import { subjectProgress } from './learn-progress.svelte';
import { coreToBoardColor, mapPossibleMovesToDests } from '$lib/features/game/utils';
import { getI18n, getLocale } from '$lib/i18n/index.svelte';

/**
 * LearnSession - Svelte 5 reactive wrapper around LearnEngine
 *
 * Provides reactive state for the learning system using Svelte 5 runes.
 * Handles scenario-based lessons with opponent responses.
 */
export class LearnSession {
  #engine: LearnEngine;
  #version = $state(0);
  #boardApi: Api | null = $state(null);

  // Feedback messages
  #feedbackMessage = $state('');
  #showFeedback = $state(false);
  #isFailed = $state(false);

  // Board shapes (arrows, highlights)
  #shapes = $state<BoardShape[]>([]);

  // Progressive hints
  #hintSystem: HintSystem | null = null;
  #currentHintLevel = $state<'none' | 'subtle' | 'medium' | 'explicit'>('none');
  #currentHintType = $state<HintLevel | null>(null);

  // Hint auto-hide timeout
  #hintTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Default duration for hint auto-hide in milliseconds */
  static readonly HINT_AUTO_HIDE_DURATION = 3000;

  constructor(lessonId?: string) {
    this.#engine = new LearnEngine({
      onMove: () => {
        this.#version++;
        this.syncBoard();
      },
      onComplete: (result) => {
        this.#feedbackMessage = this.#getSuccessFeedbackMessage();
        this.#showFeedback = true;
        this.#isFailed = false;
        this.#saveProgress(result);
        this.#version++;
        this.syncBoard();
      },
      onStateChange: (status) => {
        if (status === 'failed') {
          this.#isFailed = true;
          this.#feedbackMessage = this.#getFailureFeedbackMessage();
          this.#showFeedback = true;
        }
        this.#version++;
      },
      onOpponentMove: () => {
        this.#version++;
        this.syncBoard();
      },
      onFail: () => {
        this.#isFailed = true;
        this.#feedbackMessage = this.#getFailureFeedbackMessage();
        this.#showFeedback = true;
        this.#version++;
      },
      onShapes: (shapes) => {
        this.#shapes = shapes;
        this.#version++;
      },
      onSelect: (info: SquareInfo) => {
        if (info.feedbackCode) {
          const i18n = getI18n();
          this.#feedbackMessage = i18n.t(`learn.feedback.${info.feedbackCode}`);
          this.#showFeedback = true;
          this.#version++;
        }
      }
    });

    if (lessonId) {
      this.loadLesson(lessonId);
    }
  }

  #syncLearnLocaleWithApp(): LearnLocale {
    const appLocale = getLocale() as LearnLocale;
    setLearnLocale(appLocale);
    return appLocale;
  }

  #getCurrentTranslatedLesson(): Lesson | null {
    const lesson = this.#engine.lesson;
    if (!lesson) return null;

    const appLocale = this.#syncLearnLocaleWithApp();
    return translateLesson(lesson.subjectId ?? '', lesson, appLocale);
  }

  #getSuccessFeedbackMessage(): string {
    const i18n = getI18n();
    const translated = this.#getCurrentTranslatedLesson();
    return translated?.successMessage ?? i18n.t(`learn.feedback.${this.#engine.successCode}`);
  }

  #getFailureFeedbackMessage(): string {
    const i18n = getI18n();
    const translated = this.#getCurrentTranslatedLesson();
    return translated?.failureMessage ?? i18n.t(`learn.feedback.${this.#engine.failureCode}`);
  }

  // ============================================================
  // REACTIVE GETTERS
  // ============================================================

  get lesson(): Lesson | null {
    void this.#version;
    return this.#engine.lesson;
  }

  /**
   * Get translated lesson based on current locale
   */
  get translatedLesson(): Lesson | null {
    void this.#version;
    return this.#getCurrentTranslatedLesson();
  }

  /**
   * Get lesson title (translated)
   */
  get lessonTitle(): string {
    return this.translatedLesson?.title ?? this.#engine.lesson?.title ?? '';
  }

  /**
   * Get lesson content (translated)
   */
  get lessonContent(): string | undefined {
    return this.translatedLesson?.content ?? this.#engine.lesson?.content;
  }

  /**
   * Get lesson instruction (translated)
   */
  get lessonInstruction(): string {
    return this.translatedLesson?.instruction ?? this.#engine.lesson?.instruction ?? '';
  }

  get status(): LearnStatus {
    void this.#version;
    return this.#engine.status;
  }

  get moveCount(): number {
    void this.#version;
    return this.#engine.moveCount;
  }

  get feedbackMessage(): string {
    return this.#feedbackMessage;
  }

  get showFeedback(): boolean {
    return this.#showFeedback;
  }

  get isFailed(): boolean {
    return this.#isFailed;
  }

  get fen(): string {
    void this.#version;
    return this.#engine.fen;
  }

  get stars(): 0 | 1 | 2 | 3 {
    void this.#version;
    return this.#engine.stars;
  }

  get instruction(): string {
    return this.lessonInstruction;
  }

  /**
   * Get hint (translated)
   */
  get translatedHint(): string {
    return this.translatedLesson?.hint ?? this.#engine.lesson?.hint ?? '';
  }

  get hint(): string {
    return this.translatedHint;
  }

  get gradingSystem(): GradingSystem {
    return this.#engine.lesson?.grading ?? 'pass-fail';
  }

  get hasScenario(): boolean {
    return this.#engine.hasScenario;
  }

  get shapes(): BoardShape[] {
    return this.#shapes;
  }

  get remainingTargets(): Square[] {
    void this.#version;
    return this.#engine.remainingTargets;
  }

  get visitedTargets(): Square[] {
    void this.#version;
    return this.#engine.visitedTargets;
  }

  get boardApi(): Api | null {
    return this.#boardApi;
  }

  /**
   * Get current progressive hint level
   */
  get currentHintLevel(): 'none' | 'subtle' | 'medium' | 'explicit' {
    return this.#currentHintLevel;
  }

  /**
   * Get current progressive hint type
   */
  get currentHintType(): HintLevel | null {
    return this.#currentHintType;
  }

  /**
   * Get possible moves for the current position
   */
  getPossibleMoves() {
    return this.#engine.getPossibleMoves();
  }

  /**
   * Get information about a square (for tooltips and feedback)
   */
  getSquareInfo(square: Square): SquareInfo | null {
    return this.#engine.getSquareInfo(square);
  }

  // ============================================================
  // BOARD CONFIGURATION
  // ============================================================

  get boardConfig(): Config {
    void this.#version;

    const game = this.#engine.game;
    if (!this.#engine.lesson || !game) {
      return {
        fen: '',
        viewOnly: true
      };
    }

    const isInteractive = this.#engine.status === 'ready' && !this.#isFailed;
    const moves = this.#engine.getPossibleMoves();
    // In learn mode, the player can always move (infinite turns for their color)
    const playerColor = coreToBoardColor(game.turn());

    return {
      fen: this.#engine.fen,
      viewOnly: !isInteractive,
      turnColor: playerColor,
      highlight: {
        lastMove: true,
        check: true
      },
      events: {
        select: (key: OrigMove) => this.#handleSelect(key)
      },
      movable: {
        free: false,
        color: isInteractive ? playerColor : undefined,
        dests: isInteractive ? mapPossibleMovesToDests(moves) : new Map(),
        events: {
          after: (orig: OrigMove, dest: DestMove) => this.#handleMove(orig, dest)
        }
      },
      airDefense: {
        influenceZone: this.#getAirDefense()
      }
    };
  }

  #getAirDefense(): { red: Map<string, string[]>; blue: Map<string, string[]> } {
    const game = this.#engine.game;
    if (!game) {
      return { red: new Map(), blue: new Map() };
    }
    const airDefense = game.getAirDefenseInfluence();
    return {
      red: airDefense['r'],
      blue: airDefense['b']
    };
  }

  // ============================================================
  // LESSON MANAGEMENT
  // ============================================================

  loadLesson(lessonId: string): boolean {
    this.#showFeedback = false;
    this.#isFailed = false;
    this.#shapes = [];

    // Stop existing hint system
    if (this.#hintSystem) {
      this.#hintSystem.stop();
      this.#hintSystem = null;
    }

    const result = this.#engine.loadLesson(lessonId);

    // Load initial shapes from lesson arrows
    if (this.#engine.lesson?.arrows) {
      this.#shapes = this.#engine.lesson.arrows;
    }

    // Create hint system if lesson has hints config
    if (this.#engine.lesson?.hints) {
      this.#hintSystem = new HintSystem(this.#engine.lesson.hints, {
        onHintChange: (level, type) => {
          this.#currentHintLevel = level;
          this.#currentHintType = type ?? null;
          this.#version++;
        },
        onTutorialMode: () => {
          // Could show a tutorial modal here in the future
          console.log('Tutorial mode activated');
        }
      });
      this.#hintSystem.start();
    }

    this.#version++;
    return result;
  }

  #handleMove(orig: OrigMove, dest: DestMove): void {
    const from = orig.square as Square;
    const to = dest.square as Square;
    const success = this.#engine.makeMove(from, to, dest.stay);

    if (success) {
      // Valid move - reset hint timer
      this.#hintSystem?.onMove();
    } else if (this.#engine.status === 'ready') {
      // Invalid move - track for hint system
      this.#hintSystem?.onWrongMove();

      const i18n = getI18n();
      this.#feedbackMessage = i18n.t('learn.invalidMove');
      this.#showFeedback = true;
      this.#version++;
    }
  }

  #handleSelect(key: OrigMove): void {
    const square = key.square as Square;
    this.#engine.handleSelect(square);
  }

  restart(): void {
    this.#showFeedback = false;
    this.#isFailed = false;
    this.#shapes = [];
    this.#engine.restart();

    // Reset hint system
    this.#hintSystem?.reset();

    // Reload initial shapes
    if (this.#engine.lesson?.arrows) {
      this.#shapes = this.#engine.lesson.arrows;
    }

    this.#version++;
    this.syncBoard();
  }

  /**
   * Retry after failure (alias for restart)
   */
  retry(): void {
    this.restart();
  }

  showHint(autoHideDuration: number = LearnSession.HINT_AUTO_HIDE_DURATION): void {
    if (this.hint) {
      this.#feedbackMessage = this.hint;
      this.#showFeedback = true;
      this.#version++;

      // Clear any existing timeout
      if (this.#hintTimeoutId) {
        clearTimeout(this.#hintTimeoutId);
      }

      // Auto-hide after specified duration
      if (autoHideDuration > 0) {
        this.#hintTimeoutId = setTimeout(() => {
          this.hideHint();
        }, autoHideDuration);
      }
    }
  }

  hideHint(): void {
    if (this.#hintTimeoutId) {
      clearTimeout(this.#hintTimeoutId);
      this.#hintTimeoutId = null;
    }
    this.#showFeedback = false;
    this.#version++;
  }

  dispose(): void {
    if (this.#hintTimeoutId) {
      clearTimeout(this.#hintTimeoutId);
      this.#hintTimeoutId = null;
    }

    // Stop and cleanup hint system
    if (this.#hintSystem) {
      this.#hintSystem.stop();
      this.#hintSystem = null;
    }

    this.#engine.dispose();
  }

  // ============================================================
  // PROGRESS PERSISTENCE
  // ============================================================

  #saveProgress(result: { lessonId: string; moveCount: number; stars: 0 | 1 | 2 | 3 }): void {
    subjectProgress.saveLessonProgress(result.lessonId, result.stars, result.moveCount);
  }

  static getProgress(lessonId: string): LessonProgress | null {
    // Return a constructed object if completed, or null
    if (subjectProgress.isLessonCompleted(lessonId)) {
      return {
        lessonId,
        completed: true,
        stars: subjectProgress.getLessonStars(lessonId),
        moveCount: 0 // We don't expose moveCount in public check mostly
      };
    }
    return null;
  }

  // ============================================================
  // BOARD INTEGRATION
  // ============================================================

  setBoardApi(api: Api): void {
    this.#boardApi = api;
    this.syncBoard();
  }

  syncBoard(): void {
    if (!this.#boardApi || !this.#engine.lesson) return;
    this.#boardApi.set(this.boardConfig);
  }

  setupBoardEffect(): void {
    void this.#version;
    void this.#engine.lesson;

    if (this.#boardApi) {
      this.syncBoard();
    }
  }
}

export function createLearnSession(lessonId?: string): LearnSession {
  return new LearnSession(lessonId);
}

// Re-export from package for convenience
export { getLessonById } from '@cotulenh/learn';
export type { Lesson, LessonProgress, LearnStatus, BoardShape, SquareInfo } from '@cotulenh/learn';
