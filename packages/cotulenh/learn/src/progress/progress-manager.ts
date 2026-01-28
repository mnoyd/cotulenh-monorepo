import type { SubjectId, LessonProgress, SubjectProgress } from '../types';
import { getSubjectById } from '../lessons';
import type { StorageAdapter } from './storage-adapter';
import { MemoryStorageAdapter } from './storage-adapter';

const STORAGE_KEY = 'learn-progress';

/**
 * Framework-agnostic progress manager for learning system.
 * Handles tracking completion of subjects, sections, and lessons.
 *
 * @example
 * // Browser usage with localStorage
 * import { ProgressManager, LocalStorageAdapter } from '@cotulenh/learn';
 * const progress = new ProgressManager(new LocalStorageAdapter());
 *
 * @example
 * // React Native usage
 * const asyncStorageAdapter = {
 *   get: (key) => JSON.parse(await AsyncStorage.getItem(key)),
 *   set: (key, value) => AsyncStorage.setItem(key, JSON.stringify(value)),
 *   remove: (key) => AsyncStorage.removeItem(key)
 * };
 * const progress = new ProgressManager(asyncStorageAdapter);
 */
export class ProgressManager {
  #storage: StorageAdapter;
  #lessonProgress: Record<string, LessonProgress>;
  #onChange?: (progress: Record<string, LessonProgress>) => void;

  constructor(storage?: StorageAdapter) {
    this.#storage = storage ?? new MemoryStorageAdapter();
    this.#lessonProgress = this.#loadProgress();
  }

  /**
   * Set a callback to be notified when progress changes.
   * Useful for reactive frameworks to trigger updates.
   */
  setOnChange(callback: (progress: Record<string, LessonProgress>) => void): void {
    this.#onChange = callback;
  }

  // ============================================================
  // SUBJECT METHODS
  // ============================================================

  /**
   * Check if a subject is unlocked based on prerequisites
   */
  isSubjectUnlocked(subjectId: SubjectId): boolean {
    const subject = getSubjectById(subjectId);
    if (!subject) return false;
    if (subject.prerequisites.length === 0) return true;

    return subject.prerequisites.every((prereqId) => this.isSubjectCompleted(prereqId));
  }

  /**
   * Check if a subject is fully completed (all lessons done)
   */
  isSubjectCompleted(subjectId: SubjectId): boolean {
    const subject = getSubjectById(subjectId);
    if (!subject) return false;

    return subject.sections.every((section) =>
      section.lessons.every((lesson) => this.isLessonCompleted(lesson.id))
    );
  }

  /**
   * Get progress details for a subject
   */
  getSubjectProgress(subjectId: SubjectId): SubjectProgress {
    const subject = getSubjectById(subjectId);
    if (!subject) {
      return {
        subjectId,
        completed: false,
        sections: {},
        progress: 0
      };
    }

    let totalLessons = 0;
    let completedLessons = 0;
    const sectionProgress: Record<string, boolean> = {};

    for (const section of subject.sections) {
      let sectionCompleted = true;
      for (const lesson of section.lessons) {
        totalLessons++;
        if (this.isLessonCompleted(lesson.id)) {
          completedLessons++;
        } else {
          sectionCompleted = false;
        }
      }
      sectionProgress[section.id] = sectionCompleted;
    }

    const progress = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

    return {
      subjectId,
      completed: progress === 100,
      sections: sectionProgress,
      progress
    };
  }

  /**
   * Get the next incomplete lesson in a subject (for "Continue" functionality)
   */
  getNextIncompleteLesson(
    subjectId: SubjectId
  ): { lessonId: string; sectionId: string; title: string } | null {
    const subject = getSubjectById(subjectId);
    if (!subject) return null;

    for (const section of subject.sections) {
      for (const lesson of section.lessons) {
        if (!this.isLessonCompleted(lesson.id)) {
          return { lessonId: lesson.id, sectionId: section.id, title: lesson.title };
        }
      }
    }
    return null;
  }

  // ============================================================
  // LESSON METHODS
  // ============================================================

  /**
   * Check if a specific lesson is completed
   */
  isLessonCompleted(lessonId: string): boolean {
    return !!this.#lessonProgress[lessonId]?.completed;
  }

  /**
   * Get stars for a completed lesson
   */
  getLessonStars(lessonId: string): 0 | 1 | 2 | 3 {
    return this.#lessonProgress[lessonId]?.stars ?? 0;
  }

  /**
   * Get full progress for a lesson
   */
  getLessonProgress(lessonId: string): LessonProgress | null {
    return this.#lessonProgress[lessonId] ?? null;
  }

  /**
   * Save lesson completion (only updates if better than existing)
   */
  saveLessonProgress(lessonId: string, stars: 0 | 1 | 2 | 3, moveCount: number): void {
    const existing = this.#lessonProgress[lessonId];

    // Only update if better or new
    if (!existing || stars > existing.stars) {
      this.#lessonProgress[lessonId] = {
        lessonId,
        completed: true,
        moveCount,
        stars
      };
      this.#persist();
    }
  }

  /**
   * Reset progress for a specific lesson
   */
  resetLessonProgress(lessonId: string): void {
    delete this.#lessonProgress[lessonId];
    this.#persist();
  }

  /**
   * Reset all progress
   */
  resetAllProgress(): void {
    this.#lessonProgress = {};
    this.#persist();
  }

  /**
   * Get all lesson progress (snapshot)
   */
  getAllProgress(): Record<string, LessonProgress> {
    return { ...this.#lessonProgress };
  }

  // ============================================================
  // INTERNAL
  // ============================================================

  #loadProgress(): Record<string, LessonProgress> {
    return this.#storage.get<Record<string, LessonProgress>>(STORAGE_KEY) ?? {};
  }

  #persist(): void {
    this.#storage.set(STORAGE_KEY, this.#lessonProgress);
    this.#onChange?.(this.#lessonProgress);
  }
}

/**
 * Create a new progress manager with the given storage adapter
 */
export function createProgressManager(storage?: StorageAdapter): ProgressManager {
  return new ProgressManager(storage);
}
