import type { LearnEngine } from '../learn-engine';
import type { CompletionChecker } from './completion-checker';

/**
 * Completes after the first successful move
 */
export class FirstMoveCompletionChecker implements CompletionChecker {
  check(engine: LearnEngine): boolean {
    return engine.moveCount > 0;
  }

  getProgress(engine: LearnEngine): number {
    return this.check(engine) ? 100 : 0;
  }
}
