import { logger } from '@cotulenh/common';
import type { Api, Config, OrigMove, DestMove } from '@cotulenh/board';
import { CoTuLenh } from '@cotulenh/core';
import type { Square, MoveResult } from '@cotulenh/core';
import type { Lesson, LessonProgress } from './types';
import { getLessonById } from './lessons';
import { getStoredValue, setStoredValue } from '$lib/stores/persisted.svelte';
import { coreToBoardColor, mapPossibleMovesToDests } from '$lib/features/game/utils';

export type LearnStatus = 'loading' | 'ready' | 'completed';

export class LearnSession {
  #lesson: Lesson | null = $state(null);
  #status: LearnStatus = $state('loading');
  #moveCount = $state(0);
  #version = $state(0);

  #game: CoTuLenh | null = $state(null);
  #boardApi: Api | null = $state(null);

  // Feedback messages
  #feedbackMessage = $state('');
  #showFeedback = $state(false);

  constructor(lessonId?: string) {
    if (lessonId) {
      this.loadLesson(lessonId);
    }
  }

  // ============================================================
  // REACTIVE GETTERS
  // ============================================================

  get lesson(): Lesson | null {
    void this.#version;
    return this.#lesson;
  }

  get status(): LearnStatus {
    void this.#version;
    return this.#status;
  }

  get moveCount(): number {
    return this.#moveCount;
  }

  get feedbackMessage(): string {
    return this.#feedbackMessage;
  }

  get showFeedback(): boolean {
    return this.#showFeedback;
  }

  get fen(): string {
    void this.#version;
    return this.#game?.fen() ?? this.#lesson?.startFen ?? '';
  }

  get stars(): 0 | 1 | 2 | 3 {
    // Star rating based on move count efficiency
    // For now: 3 stars if solved in minimal moves, fewer stars for more moves
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

  // ============================================================
  // BOARD CONFIGURATION
  // ============================================================

  get boardConfig(): Config {
    if (!this.#lesson || !this.#game) {
      return {
        fen: '',
        viewOnly: true
      };
    }

    const moves = this.#game.moves({ verbose: true, legal: false }) as MoveResult[];

    return {
      fen: this.#game.fen(),
      viewOnly: this.#status === 'completed',
      turnColor: coreToBoardColor(this.#game.turn()),
      movable: {
        free: false,
        color: coreToBoardColor(this.#game.turn()),
        dests: mapPossibleMovesToDests(moves),
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
    const lesson = getLessonById(lessonId);
    if (!lesson) {
      logger.error('Lesson not found:', { lessonId });
      return false;
    }

    this.#lesson = lesson;
    this.#moveCount = 0;
    this.#status = 'ready';
    this.#showFeedback = false;

    try {
      this.#game = new CoTuLenh(lesson.startFen);
      this.#version++;
    } catch (error) {
      logger.error('Failed to load lesson FEN:', { error, fen: lesson.startFen });
      return false;
    }

    return true;
  }

  #handleMove(orig: OrigMove, dest: DestMove): void {
    if (!this.#lesson || !this.#game) return;

    const from = orig as unknown as Square;
    const to = dest as unknown as Square;

    // Make the move
    try {
      this.#game.move({ from, to }, { legal: false });
      this.#moveCount++;
    } catch (error) {
      logger.error('Move failed:', { error, from, to });
      return;
    }

    // Check if goal reached by comparing position parts of FEN
    const currentPosition = this.#extractPositionFen(this.#game.fen());
    const goalPosition = this.#extractPositionFen(this.#lesson.goalFen);

    if (currentPosition === goalPosition) {
      this.#status = 'completed';
      this.#feedbackMessage = this.#lesson.successMessage ?? 'Well done!';
      this.#showFeedback = true;
      this.#saveProgress();
    }

    this.#version++;
  }

  /**
   * Extract only the position part of FEN (before first space)
   * This allows comparison regardless of turn, castling rights, etc.
   */
  #extractPositionFen(fen: string): string {
    return fen.split(' ')[0];
  }

  restart(): void {
    if (!this.#lesson) return;

    this.#moveCount = 0;
    this.#status = 'ready';
    this.#showFeedback = false;

    try {
      this.#game = new CoTuLenh(this.#lesson.startFen);
      this.#version++;
    } catch (error) {
      logger.error('Failed to restart lesson:', { error });
    }
  }

  showHint(): void {
    if (this.#lesson?.hint) {
      this.#feedbackMessage = this.#lesson.hint;
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

  #saveProgress(): void {
    if (!this.#lesson) return;

    const key = 'learn-progress';
    const allProgress = getStoredValue<Record<string, LessonProgress>>(key, {});

    // Only save if new completion or better star rating
    const existing = allProgress[this.#lesson.id];
    if (!existing || this.stars > existing.stars) {
      allProgress[this.#lesson.id] = {
        lessonId: this.#lesson.id,
        completed: true,
        moveCount: this.#moveCount,
        stars: this.stars
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
    if (!this.#boardApi || !this.#lesson) return;

    this.#boardApi.set(this.boardConfig);
  }

  setupBoardEffect(): void {
    void this.#version;
    void this.#lesson;

    if (this.#boardApi) {
      this.syncBoard();
    }
  }
}

export function createLearnSession(lessonId?: string): LearnSession {
  return new LearnSession(lessonId);
}
