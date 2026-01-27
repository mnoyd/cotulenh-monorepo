import type { Lesson, LessonResult } from '../types';
import type { Grader } from './grader';

/**
 * No grading - just marks as complete
 */
export class NoGrader implements Grader {
  grade(moveCount: number, lesson: Lesson): LessonResult {
    return {
      lessonId: lesson.id,
      completed: true,
      moveCount,
      stars: 0
    };
  }
}
