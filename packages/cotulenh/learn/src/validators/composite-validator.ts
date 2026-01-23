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
}

export type { MoveValidator, MoveValidationResult };
