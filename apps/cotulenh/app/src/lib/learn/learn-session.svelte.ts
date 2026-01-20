import type { Api, Config, OrigMove, DestMove } from '@cotulenh/board';
import type { Square, MoveResult } from '@cotulenh/core';
import {
  LearnEngine,
  type Lesson,
  type LessonProgress,
  type LearnStatus,
  type BoardShape
} from '@cotulenh/learn';
import { getStoredValue, setStoredValue } from '$lib/stores/persisted.svelte';
import { coreToBoardColor, mapPossibleMovesToDests } from '$lib/features/game/utils';

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
        this.#feedbackMessage = this.#engine.successMessage;
        this.#showFeedback = true;
        this.#isFailed = false;
        this.#saveProgress(result);
        this.#version++;
        this.syncBoard();
      },
      onStateChange: (status) => {
        if (status === 'failed') {
          this.#isFailed = true;
          this.#feedbackMessage = this.#engine.failureMessage;
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
        this.#feedbackMessage = this.#engine.failureMessage;
        this.#showFeedback = true;
        this.#version++;
      },
      onShapes: (shapes) => {
        this.#shapes = shapes;
        this.#version++;
      }
    });

    if (lessonId) {
      this.loadLesson(lessonId);
    }
  }

  // ============================================================
  // REACTIVE GETTERS
  // ============================================================

  get lesson(): Lesson | null {
    void this.#version;
    return this.#engine.lesson;
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
    return this.#engine.instruction;
  }

  get hint(): string {
    return this.#engine.hint;
  }

  get hasScenario(): boolean {
    return this.#engine.hasScenario;
  }

  get shapes(): BoardShape[] {
    return this.#shapes;
  }

  get boardApi(): Api | null {
    return this.#boardApi;
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
      movable: {
        free: false,
        color: isInteractive ? playerColor : undefined,
        dests: isInteractive ? mapPossibleMovesToDests(moves as MoveResult[]) : new Map(),
        events: {
          after: (orig: OrigMove, dest: DestMove) => this.#handleMove(orig, dest)
        }
      }
    };
  }

  // ============================================================
  // LESSON MANAGEMENT
  // ============================================================

  loadLesson(lessonId: string): boolean {
    this.#showFeedback = false;
    this.#isFailed = false;
    this.#shapes = [];
    const result = this.#engine.loadLesson(lessonId);

    // Load initial shapes from lesson arrows
    if (this.#engine.lesson?.arrows) {
      this.#shapes = this.#engine.lesson.arrows;
    }

    this.#version++;
    return result;
  }

  #handleMove(orig: OrigMove, dest: DestMove): void {
    const from = orig.square as Square;
    const to = dest.square as Square;
    this.#engine.makeMove(from, to);
  }

  restart(): void {
    this.#showFeedback = false;
    this.#isFailed = false;
    this.#shapes = [];
    this.#engine.restart();

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
    if (this.#engine.hint) {
      this.#feedbackMessage = this.#engine.hint;
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

  // ============================================================
  // PROGRESS PERSISTENCE
  // ============================================================

  #saveProgress(result: { lessonId: string; moveCount: number; stars: 0 | 1 | 2 | 3 }): void {
    const key = 'learn-progress';
    const allProgress = getStoredValue<Record<string, LessonProgress>>(key, {});

    const existing = allProgress[result.lessonId];
    if (!existing || result.stars > existing.stars) {
      allProgress[result.lessonId] = {
        lessonId: result.lessonId,
        completed: true,
        moveCount: result.moveCount,
        stars: result.stars
      };
      setStoredValue(key, allProgress);
    }
  }

  static getProgress(lessonId: string): LessonProgress | null {
    const allProgress = getStoredValue<Record<string, LessonProgress>>('learn-progress', {});
    return allProgress[lessonId] ?? null;
  }

  static getAllProgress(): Record<string, LessonProgress> {
    return getStoredValue<Record<string, LessonProgress>>('learn-progress', {});
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
export { categories, getLessonById, getCategoryById, getNextLesson } from '@cotulenh/learn';
export type {
  Lesson,
  LessonProgress,
  CategoryInfo,
  LearnStatus,
  BoardShape
} from '@cotulenh/learn';
