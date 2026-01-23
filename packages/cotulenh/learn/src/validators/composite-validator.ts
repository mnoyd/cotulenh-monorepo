import type { InternalMove } from '@cotulenh/core';
import type { AntiRuleCore } from '../anti-rule-core';
import type { MoveValidationResult } from '../types';
import type { MoveValidator } from './move-validator';

/**
 * Composite validator that chains multiple validators
 */
export class CompositeValidator implements MoveValidator {
  constructor(private validators: MoveValidator[]) {}

  validate(move: InternalMove, game: AntiRuleCore): MoveValidationResult {
    for (const validator of this.validators) {
      const result = validator.validate(move, game);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }

  addValidator(validator: MoveValidator): void {
    this.validators.push(validator);
  }

  get validatorCount(): number {
    return this.validators.length;
  }

  /**
   * Find a validator of a specific type
   */
  findValidator<T extends MoveValidator>(type: new (...args: any[]) => T): T | null {
    for (const validator of this.validators) {
      if (validator instanceof type) {
        return validator;
      }
    }
    return null;
  }

  /**
   * Get all validators
   */
  getValidators(): MoveValidator[] {
    return [...this.validators];
  }
}

export type { MoveValidator, MoveValidationResult };
