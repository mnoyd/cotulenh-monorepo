import type { Lesson, LessonResult } from '../types';
import type { Grader } from './grader';

/**
 * Pass/fail grading - gives 1 star for completion
 */
export class PassFailGrader implements Grader {
  grade(moveCount: number, lesson: Lesson): LessonResult {
    return {
      lessonId: lesson.id,
      completed: true,
      moveCount,
      stars: 1
    };
  }
}
