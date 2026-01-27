import type { InternalMove } from '@cotulenh/core';
import type { AntiRuleCore } from '../anti-rule-core';
import type { MoveValidationResult } from '../types';

/**
 * Base interface for move validators
 */
export interface MoveValidator {
  validate(move: InternalMove, game: AntiRuleCore): MoveValidationResult;
}
