import type { Lesson, LessonResult } from '../types';

/**
 * Base interface for lesson graders
 */
export interface Grader {
  /**
   * Grade the lesson completion
   */
  grade(moveCount: number, lesson: Lesson): LessonResult;
}
