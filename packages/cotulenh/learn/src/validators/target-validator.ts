import type { InternalMove, Square } from '@cotulenh/core';
import type { AntiRuleCore } from '../anti-rule-core';
import type { MoveValidationResult } from '../types';
import type { MoveValidator } from './move-validator';

/**
 * Validates moves against target squares
 * Can be ordered (must visit in sequence) or unordered (any order)
 */
export class TargetValidator implements MoveValidator {
  private visitedTargets = new Set<Square>();
  private currentIndex = 0;

  constructor(
    private targets: Square[],
    private ordered: boolean = false
  ) {}

  validate(move: InternalMove, game: AntiRuleCore): MoveValidationResult {
    if (this.ordered) {
      return this.validateOrdered(move);
    }
    return this.validateUnordered(move);
  }

  private validateOrdered(move: InternalMove): MoveValidationResult {
    const expectedTarget = this.targets[this.currentIndex];

    if (!expectedTarget) {
      return { valid: true };
    }

    if (move.to === expectedTarget) {
      this.visitedTargets.add(expectedTarget);
      this.currentIndex++;

      return {
        valid: true,
        feedbackData: {
          type: 'generic',
          severity: 'info',
          code: 'TARGET_REACHED',
          context: {
            target: expectedTarget,
            remaining: this.targets.length - this.currentIndex
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
          expected: expectedTarget,
          actual: move.to
        }
      }
    };
  }

  private validateUnordered(move: InternalMove): MoveValidationResult {
    if (this.targets.includes(move.to) && !this.visitedTargets.has(move.to)) {
      this.visitedTargets.add(move.to);

      return {
        valid: true,
        feedbackData: {
          type: 'generic',
          severity: 'info',
          code: 'TARGET_REACHED',
          context: {
            target: move.to,
            remaining: this.targets.length - this.visitedTargets.size
          }
        }
      };
    }

    return { valid: true };
  }

  get isComplete(): boolean {
    return this.visitedTargets.size === this.targets.length;
  }

  get remainingTargets(): Square[] {
    if (this.ordered) {
      return this.targets.slice(this.currentIndex);
    }
    return this.targets.filter((t) => !this.visitedTargets.has(t));
  }

  reset(): void {
    this.visitedTargets.clear();
    this.currentIndex = 0;
  }
}
