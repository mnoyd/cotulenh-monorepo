import { AIR_FORCE, algebraic, getMovementMask } from '@cotulenh/core';
import type { InternalMove } from '@cotulenh/core';
import type { AntiRuleCore } from '../anti-rule-core';
import type { MoveValidationResult } from '../types';
import type { MoveValidator } from './move-validator';

/**
 * Validates moves against terrain restrictions
 */
export class TerrainValidator implements MoveValidator {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate(move: InternalMove, _game: AntiRuleCore): MoveValidationResult {
    if (move.piece.type === AIR_FORCE) {
      return { valid: true };
    }

    const mask = getMovementMask(move.piece.type);
    if (mask[move.to] === 1) {
      return { valid: true };
    }

    return {
      valid: false,
      feedbackData: {
        type: 'terrain',
        severity: 'error',
        code: 'INVALID_TERRAIN',
        context: {
          piece: move.piece.type,
          square: algebraic(move.to)
        }
      }
    };
  }
}
