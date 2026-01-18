import { logger } from '@cotulenh/common';
import type { Api, Config, OrigMove, DestMove } from '@cotulenh/board';
import type { Square, MoveResult } from '@cotulenh/core';
import { LearnEngine, type Lesson, type LessonProgress, type LearnStatus } from '@cotulenh/learn';
import { getStoredValue, setStoredValue } from '$lib/stores/persisted.svelte';
import { coreToBoardColor, mapPossibleMovesToDests } from '$lib/features/game/utils';

/**
 * LearnSession - Svelte 5 reactive wrapper around LearnEngine
 *
 * Provides reactive state for the learning system using Svelte 5 runes.
 */
export class LearnSession {
  #engine: LearnEngine;
  #version = $state(0);
  #boardApi: Api | null = $state(null);

  // Feedback messages
  #feedbackMessage = $state('');
  #showFeedback = $state(false);

  constructor(lessonId?: string) {
    this.#engine = new LearnEngine({
      onMove: () => {
        this.#version++;
      },
      onComplete: (result) => {
        this.#feedbackMessage = this.#engine.successMessage;
        this.#showFeedback = true;
        this.#saveProgress(result);
        this.#version++;
      },
      onStateChange: () => {
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

    const moves = this.#engine.getPossibleMoves();

    return {
      fen: this.#engine.fen,
      viewOnly: this.#engine.status === 'completed',
      turnColor: coreToBoardColor(game.turn()),
      movable: {
        free: false,
        color: coreToBoardColor(game.turn()),
        dests: mapPossibleMovesToDests(moves as MoveResult[]),
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
    const result = this.#engine.loadLesson(lessonId);
    this.#version++;
    return result;
  }

  #handleMove(orig: OrigMove, dest: DestMove): void {
    const from = orig as unknown as Square;
    const to = dest as unknown as Square;
    this.#engine.makeMove(from, to);
  }

  restart(): void {
    this.#showFeedback = false;
    this.#engine.restart();
    this.#version++;
  }

  showHint(): void {
    if (this.#engine.hint) {
      this.#feedbackMessage = this.#engine.hint;
      this.#showFeedback = true;
      this.#version++;
    }
  }

  hideHint(): void {
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
export type { Lesson, LessonProgress, CategoryInfo, LearnStatus } from '@cotulenh/learn';
