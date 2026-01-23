import type { LearnEngine } from '../learn-engine';
import type { TargetValidator } from '../validators/target-validator';
import type { CompletionChecker } from './completion-checker';

/**
 * Checks completion based on visiting all target squares
 */
export class TargetCompletionChecker implements CompletionChecker {
  constructor(private targetValidator: TargetValidator) {}

  check(engine: LearnEngine): boolean {
    return this.targetValidator.isComplete;
  }

  getProgress(engine: LearnEngine): number {
    const total = this.targetValidator.remainingTargets.length;
    if (total === 0) return 100;

    const visited = total - this.targetValidator.remainingTargets.length;
    return Math.floor((visited / total) * 100);
  }
}
