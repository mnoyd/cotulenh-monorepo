import type { Lesson, LessonResult } from '../types';
import type { Grader } from './grader';

/**
 * Star grading - 1-3 stars based on move efficiency
 */
export class StarGrader implements Grader {
  grade(moveCount: number, lesson: Lesson): LessonResult {
    const optimal = lesson.optimalMoves ?? moveCount;
    const stars = this.calculateStars(moveCount, optimal);

    return {
      lessonId: lesson.id,
      completed: true,
      moveCount,
      stars
    };
  }

  private calculateStars(actual: number, optimal: number): 0 | 1 | 2 | 3 {
    if (actual === optimal) return 3;
    if (actual <= optimal * 1.5) return 2;
    if (actual <= optimal * 2) return 1;
    return 0;
  }
}
