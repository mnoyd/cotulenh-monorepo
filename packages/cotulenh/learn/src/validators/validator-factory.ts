import type { Lesson } from '../types';
import type { LearnEngine } from '../learn-engine';
import type { MoveValidator } from './move-validator';
import { CompositeValidator } from './composite-validator';
import { TargetValidator } from './target-validator';
import { CustomValidator } from './custom-validator';
import { TerrainValidator } from './terrain-validator';

/**
 * Factory for creating validators based on lesson configuration
 */
export class ValidatorFactory {
  static create(lesson: Lesson, engine: LearnEngine): MoveValidator {
    const validators: MoveValidator[] = [];

    // Add target validator if needed
    if (lesson.targetSquares && lesson.targetSquares.length > 0) {
      validators.push(new TargetValidator(lesson.targetSquares, lesson.orderedTargets ?? false));
    }

    // Add custom validator if provided
    if (lesson.customMoveValidator) {
      validators.push(new CustomValidator(lesson.customMoveValidator, engine));
    }

    // Add terrain validator if requested
    if (lesson.validateTerrain) {
      validators.push(new TerrainValidator());
    }

    // Return composite validator
    return new CompositeValidator(validators);
  }
}
