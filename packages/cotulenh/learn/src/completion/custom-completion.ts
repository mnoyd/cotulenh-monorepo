import type { LearnEngine } from '../learn-engine';
import type { CompletionChecker } from './completion-checker';

/**
 * Checks completion using a custom function
 */
export class CustomCompletionChecker implements CompletionChecker {
  constructor(private completionFn: (engine: LearnEngine) => boolean) {}

  check(engine: LearnEngine): boolean {
    return this.completionFn(engine);
  }

  getProgress(engine: LearnEngine): number {
    return this.check(engine) ? 100 : 0;
  }
}
