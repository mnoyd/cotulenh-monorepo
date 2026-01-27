import type { Lesson } from '../types';
import type { Grader } from './grader';
import { NoGrader } from './no-grader';
import { PassFailGrader } from './pass-fail-grader';
import { StarGrader } from './star-grader';

/**
 * Factory for creating graders based on lesson configuration
 */
export class GraderFactory {
  static create(lesson: Lesson): Grader {
    const gradingSystem = lesson.grading ?? 'pass-fail';

    switch (gradingSystem) {
      case 'none':
        return new NoGrader();
      case 'pass-fail':
        return new PassFailGrader();
      case 'stars':
        return new StarGrader();
      default:
        return new PassFailGrader();
    }
  }
}
