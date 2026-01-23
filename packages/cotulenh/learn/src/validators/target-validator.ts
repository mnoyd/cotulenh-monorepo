import type { InternalMove, Square } from '@cotulenh/core';
import { algebraic, SQUARE_MAP } from '@cotulenh/core';
import type { AntiRuleCore } from '../anti-rule-core';
import type { MoveValidationResult } from '../types';
import type { MoveValidator } from './move-validator';

/**
 * Validates moves against target squares
 * Can be ordered (must visit in sequence) or unordered (any order)
 */
export class TargetValidator implements MoveValidator {
  private visitedTargets = new Set<number>();
  private currentIndex = 0;
  private targetIndices: number[];

  constructor(
    private targets: Square[],
    private ordered: boolean = false
  ) {
    // Convert Square strings to numeric indices for comparison
    this.targetIndices = targets.map((sq) => SQUARE_MAP[sq]);
  }

  validate(move: InternalMove, game: AntiRuleCore): MoveValidationResult {
    if (this.ordered) {
      return this.validateOrdered(move);
    }
    return this.validateUnordered(move);
  }

  private validateOrdered(move: InternalMove): MoveValidationResult {
    const expectedTargetIndex = this.targetIndices[this.currentIndex];

    if (expectedTargetIndex === undefined) {
      return { valid: true };
    }

    if (move.to === expectedTargetIndex) {
      this.visitedTargets.add(expectedTargetIndex);
      this.currentIndex++;

      return {
        valid: true,
        feedbackData: {
          type: 'generic',
          severity: 'info',
          code: 'TARGET_REACHED',
          context: {
            target: algebraic(expectedTargetIndex),
            remaining: this.targetIndices.length - this.currentIndex
          }
        }
      };
    }

    return {
      valid: false,
      feedbackData: {
        type: 'scenario',
        severity: 'error',
        code: 'WRONG_TARGET',
        context: {
          expected: algebraic(expectedTargetIndex),
          actual: algebraic(move.to)
        }
      }
    };
  }

  private validateUnordered(move: InternalMove): MoveValidationResult {
    if (this.targetIndices.includes(move.to) && !this.visitedTargets.has(move.to)) {
      this.visitedTargets.add(move.to);

      return {
        valid: true,
        feedbackData: {
          type: 'generic',
          severity: 'info',
          code: 'TARGET_REACHED',
          context: {
            target: algebraic(move.to),
            remaining: this.targetIndices.length - this.visitedTargets.size
          }
        }
      };
    }

    return { valid: true };
  }

  get isComplete(): boolean {
    return this.visitedTargets.size === this.targetIndices.length;
  }

  get remainingTargets(): Square[] {
    if (this.ordered) {
      return this.targetIndices.slice(this.currentIndex).map((idx) => algebraic(idx));
    }
    return this.targetIndices
      .filter((idx) => !this.visitedTargets.has(idx))
      .map((idx) => algebraic(idx));
  }

  reset(): void {
    this.visitedTargets.clear();
    this.currentIndex = 0;
  }
}
