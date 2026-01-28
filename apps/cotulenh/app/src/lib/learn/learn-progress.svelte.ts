import { getStoredValue, setStoredValue } from '$lib/stores/persisted.svelte';
import {
  ProgressManager,
  type StorageAdapter,
  type SubjectId,
  type LessonProgress,
  type SubjectProgress
} from '@cotulenh/learn';

/**
 * Svelte-compatible storage adapter that uses persisted.svelte utilities.
 * This bridges the framework-agnostic ProgressManager with Svelte's storage.
 */
class SvelteStorageAdapter implements StorageAdapter {
  get<T>(key: string): T | null {
    return getStoredValue<T>(key, null as T) ?? null;
  }

  set<T>(key: string, value: T): void {
    setStoredValue(key, value);
  }

  remove(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Svelte 5 reactive wrapper around ProgressManager.
 * Provides reactive state updates when progress changes.
 */
export class SubjectProgressManager {
  #manager: ProgressManager;
  #version = $state(0);

  constructor() {
    this.#manager = new ProgressManager(new SvelteStorageAdapter());
    this.#manager.setOnChange(() => {
      this.#version++;
    });
  }

  // ============================================================
  // REACTIVE PROXY METHODS
  // ============================================================

  /**
   * Check if a subject is unlocked based on prerequisites
   */
  isSubjectUnlocked(subjectId: SubjectId): boolean {
    void this.#version; // Track for reactivity
    return this.#manager.isSubjectUnlocked(subjectId);
  }

  /**
   * Check if a subject is fully completed (all lessons done)
   */
  isSubjectCompleted(subjectId: SubjectId): boolean {
    void this.#version;
    return this.#manager.isSubjectCompleted(subjectId);
  }

  /**
   * Check if a specific lesson is completed
   */
  isLessonCompleted(lessonId: string): boolean {
    void this.#version;
    return this.#manager.isLessonCompleted(lessonId);
  }

  /**
   * Get progress details for a subject
   */
  getSubjectProgress(subjectId: SubjectId): SubjectProgress {
    void this.#version;
    return this.#manager.getSubjectProgress(subjectId);
  }

  /**
   * Save lesson completion
   */
  saveLessonProgress(lessonId: string, stars: 0 | 1 | 2 | 3, moveCount: number): void {
    this.#manager.saveLessonProgress(lessonId, stars, moveCount);
  }

  /**
   * Get stars for a completed lesson
   */
  getLessonStars(lessonId: string): 0 | 1 | 2 | 3 {
    void this.#version;
    return this.#manager.getLessonStars(lessonId);
  }

  /**
   * Get the next incomplete lesson in a subject (for "Continue" functionality)
   */
  getNextIncompleteLesson(
    subjectId: SubjectId
  ): { lessonId: string; sectionId: string; title: string } | null {
    void this.#version;
    return this.#manager.getNextIncompleteLesson(subjectId);
  }

  /**
   * Get full progress for a lesson
   */
  getLessonProgress(lessonId: string): LessonProgress | null {
    void this.#version;
    return this.#manager.getLessonProgress(lessonId);
  }

  /**
   * Reset progress for a specific lesson
   */
  resetLessonProgress(lessonId: string): void {
    this.#manager.resetLessonProgress(lessonId);
  }

  /**
   * Reset all progress
   */
  resetAllProgress(): void {
    this.#manager.resetAllProgress();
  }

  /**
   * Get all lesson progress (snapshot)
   */
  getAllProgress(): Record<string, LessonProgress> {
    void this.#version;
    return this.#manager.getAllProgress();
  }
}

// Singleton instance
export const subjectProgress = new SubjectProgressManager();

// Re-export types for convenience
export type { SubjectId, LessonProgress, SubjectProgress };
