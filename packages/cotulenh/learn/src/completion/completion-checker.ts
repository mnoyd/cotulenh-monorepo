import type { LearnEngine } from '../learn-engine';

/**
 * Base interface for completion checkers
 */
export interface CompletionChecker {
  /**
   * Check if lesson is complete
   */
  check(engine: LearnEngine): boolean;

  /**
   * Get progress percentage (0-100)
   */
  getProgress(engine: LearnEngine): number;
}
