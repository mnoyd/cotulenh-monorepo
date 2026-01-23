import type { InternalMove } from '@cotulenh/core';
import type { AntiRuleCore } from '../anti-rule-core';
import type { LearnEngine } from '../learn-engine';
import type { MoveValidationResult } from '../types';
import type { MoveValidator } from './move-validator';

/**
 * Custom validator that wraps a user-provided validation function
 */
export class CustomValidator implements MoveValidator {
  constructor(
    private validatorFn: (move: InternalMove, engine: LearnEngine) => string | null,
    private engine: LearnEngine
  ) {}

  validate(move: InternalMove, game: AntiRuleCore): MoveValidationResult {
    const error = this.validatorFn(move, this.engine);

    if (error) {
      return {
        valid: false,
        feedbackData: {
          type: 'generic',
          severity: 'error',
          code: 'CUSTOM_VALIDATION_FAILED',
          context: { error }
        }
      };
    }

    return { valid: true };
  }
}
