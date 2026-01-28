import type { LearnEngine } from '../learn-engine';
import type { TargetValidator } from '../validators/target-validator';
import type { CompletionChecker } from './completion-checker';

/**
 * Checks completion based on visiting all target squares
 */
export class TargetCompletionChecker implements CompletionChecker {
  readonly #totalTargets: number;

  constructor(private targetValidator: TargetValidator) {
    this.#totalTargets = targetValidator.remainingTargets.length;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  check(_engine: LearnEngine): boolean {
    return this.targetValidator.isComplete;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getProgress(_engine: LearnEngine): number {
    if (this.#totalTargets === 0) return 100;

    const remaining = this.targetValidator.remainingTargets.length;
    const visited = this.#totalTargets - remaining;
    return Math.floor((visited / this.#totalTargets) * 100);
  }
}
