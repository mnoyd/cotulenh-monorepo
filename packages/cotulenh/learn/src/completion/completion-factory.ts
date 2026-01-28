import type { Lesson } from '../types';
import type { MoveValidator } from '../validators/move-validator';
import type { CompletionChecker } from './completion-checker';
import { CustomCompletionChecker } from './custom-completion';
import { GoalCompletionChecker } from './goal-completion';
import { TargetCompletionChecker } from './target-completion';
import { FirstMoveCompletionChecker } from './first-move-completion';
import { TargetValidator } from '../validators/target-validator';
import { CompositeValidator } from '../validators/composite-validator';

/**
 * Factory for creating completion checkers based on lesson configuration
 */
export class CompletionFactory {
  static create(lesson: Lesson, validators: MoveValidator[]): CompletionChecker {
    // Custom completion has highest priority
    if (lesson.customCompletion) {
      return new CustomCompletionChecker(lesson.customCompletion);
    }

    // Target completion
    if (lesson.targetSquares && lesson.targetSquares.length > 0) {
      const targetValidator =
        validators.find((v) => v instanceof TargetValidator) ??
        validators
          .filter((v) => v instanceof CompositeValidator)
          .map((v) => (v as CompositeValidator).findValidator(TargetValidator))
          .find((v): v is TargetValidator => v !== null);

      if (targetValidator) {
        return new TargetCompletionChecker(targetValidator);
      }
    }

    // Goal FEN completion
    if (lesson.goalFen) {
      return new GoalCompletionChecker(lesson.goalFen);
    }

    // Default: complete after first move
    return new FirstMoveCompletionChecker();
  }
}
