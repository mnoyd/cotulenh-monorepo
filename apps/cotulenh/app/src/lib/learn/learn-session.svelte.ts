import { logger } from '@cotulenh/common';
import type { Api, Config, OrigMove, DestMove } from '@cotulenh/board';
import { CoTuLenh } from '@cotulenh/core';
import type { Square, MoveResult } from '@cotulenh/core';
import type { Lesson, LessonStep, LessonProgress } from './types';
import { getLessonById } from './lessons';
import { getStoredValue, setStoredValue } from '$lib/stores/persisted.svelte';
import { coreToBoardColor, mapPossibleMovesToDests } from '$lib/features/game/utils';

export type LearnStatus = 'loading' | 'ready' | 'correct' | 'incorrect' | 'completed';

export class LearnSession {
  #lesson: Lesson | null = $state(null);
  #currentStepIndex = $state(0);
  #status: LearnStatus = $state('loading');
  #mistakes = $state(0);
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

  get currentStep(): LessonStep | null {
    void this.#version;
    if (!this.#lesson) return null;
    return this.#lesson.steps[this.#currentStepIndex] ?? null;
  }

  get currentStepIndex(): number {
    return this.#currentStepIndex;
  }

  get totalSteps(): number {
    return this.#lesson?.steps.length ?? 0;
  }

  get progress(): number {
    if (!this.#lesson) return 0;
    return Math.round((this.#currentStepIndex / this.#lesson.steps.length) * 100);
  }

  get status(): LearnStatus {
    void this.#version;
    return this.#status;
  }

  get mistakes(): number {
    return this.#mistakes;
  }

  get feedbackMessage(): string {
    return this.#feedbackMessage;
  }

  get showFeedback(): boolean {
    return this.#showFeedback;
  }

  get fen(): string {
    void this.#version;
    return this.currentStep?.fen ?? '';
  }

  get stars(): 0 | 1 | 2 | 3 {
    if (this.#mistakes === 0) return 3;
    if (this.#mistakes <= 2) return 2;
    if (this.#mistakes <= 5) return 1;
    return 0;
  }

  // ============================================================
  // BOARD CONFIGURATION
  // ============================================================

  get boardConfig(): Config {
    const step = this.currentStep;
    if (!step || !this.#game) {
      return {
        fen: '',
        viewOnly: true
      };
    }

    const moves = this.#game.moves({ verbose: true, legal: false }) as MoveResult[];

    return {
      fen: step.fen,
      viewOnly: this.#status === 'completed' || this.#status === 'correct',
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
    this.#currentStepIndex = 0;
    this.#mistakes = 0;
    this.#status = 'ready';
    this.#loadStep(0);
    this.#version++;
    return true;
  }

  #loadStep(index: number): void {
    const step = this.#lesson?.steps[index];
    if (!step) return;

    try {
      this.#game = new CoTuLenh(step.fen);
      this.#status = 'ready';
      this.#showFeedback = false;
      this.#version++;
    } catch (error) {
      logger.error('Failed to load step FEN:', { error, fen: step.fen });
    }
  }

  #handleMove(orig: OrigMove, dest: DestMove): void {
    const step = this.currentStep;
    if (!step || !this.#game) return;

    const from = orig as unknown as Square;
    const to = dest as unknown as Square;

    // Check if move matches expected
    const isCorrect =
      step.freePlay || step.expectedMoves.some((m) => m.from === from && m.to === to);

    if (isCorrect) {
      // Make the move in the game
      try {
        this.#game.move({ from, to }, { legal: false });
      } catch {
        // Move might fail if position changed
      }

      this.#status = 'correct';
      this.#feedbackMessage = step.successMessage ?? 'Correct!';
      this.#showFeedback = true;
      this.#version++;

      // Auto-advance after delay
      setTimeout(() => this.nextStep(), 1000);
    } else {
      this.#mistakes++;
      this.#status = 'incorrect';
      this.#feedbackMessage = step.hint ?? 'Try again!';
      this.#showFeedback = true;
      this.#version++;

      // Sync board back to correct position
      setTimeout(() => {
        this.#showFeedback = false;
        this.#status = 'ready';
        this.syncBoard();
        this.#version++;
      }, 1500);
    }
  }

  nextStep(): void {
    if (!this.#lesson) return;

    const nextIndex = this.#currentStepIndex + 1;

    if (nextIndex >= this.#lesson.steps.length) {
      // Lesson complete!
      this.#status = 'completed';
      this.#saveProgress();
      this.#version++;
    } else {
      this.#currentStepIndex = nextIndex;
      this.#loadStep(nextIndex);
    }
  }

  restart(): void {
    this.#currentStepIndex = 0;
    this.#mistakes = 0;
    this.#status = 'ready';
    this.#loadStep(0);
    this.#version++;
  }

  // ============================================================
  // PROGRESS PERSISTENCE
  // ============================================================

  #saveProgress(): void {
    if (!this.#lesson) return;

    const key = 'learn-progress';
    const allProgress = getStoredValue<Record<string, LessonProgress>>(key, {});

    allProgress[this.#lesson.id] = {
      lessonId: this.#lesson.id,
      completedSteps: this.#lesson.steps.length,
      completed: true,
      stars: this.stars,
      mistakes: this.#mistakes
    };

    setStoredValue(key, allProgress);
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
    if (!this.#boardApi || !this.currentStep) return;

    this.#boardApi.set(this.boardConfig);
  }

  setupBoardEffect(): void {
    void this.#version;
    void this.currentStep;

    if (this.#boardApi) {
      this.syncBoard();
    }
  }
}

export function createLearnSession(lessonId?: string): LearnSession {
  return new LearnSession(lessonId);
}
