import { getStoredValue, setStoredValue } from '$lib/stores/persisted.svelte';
import {
  type SubjectId,
  type LessonProgress,
  type SubjectProgress,
  getSubjectById
} from '@cotulenh/learn';

/**
 * Manages progress tracking for Subjects, Sections, and Lessons.
 * Uses localStorage to persist progress.
 */
export class SubjectProgressManager {
  #lessonProgress = $state<Record<string, LessonProgress>>({});

  constructor() {
    this.#loadProgress();
  }

  // ============================================================
  // PUBLIC API
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

    // Check if every lesson in every section is completed
    return subject.sections.every((section) =>
      section.lessons.every((lesson) => this.isLessonCompleted(lesson.id))
    );
  }

  /**
   * Check if a specific lesson is completed
   */
  isLessonCompleted(lessonId: string): boolean {
    return !!this.#lessonProgress[lessonId]?.completed;
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
   * Save lesson completion
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
   * Get stars for a completed lesson
   */
  getLessonStars(lessonId: string): 0 | 1 | 2 | 3 {
    return this.#lessonProgress[lessonId]?.stars ?? 0;
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
  // INTERNAL
  // ============================================================

  #loadProgress(): void {
    this.#lessonProgress = getStoredValue<Record<string, LessonProgress>>('learn-progress', {});
  }

  #persist(): void {
    setStoredValue('learn-progress', $state.snapshot(this.#lessonProgress));
  }
}

// Singleton instance
export const subjectProgress = new SubjectProgressManager();
