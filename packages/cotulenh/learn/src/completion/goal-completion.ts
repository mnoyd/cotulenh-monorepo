import type { LearnEngine } from '../learn-engine';
import type { CompletionChecker } from './completion-checker';

/**
 * Checks completion based on reaching a goal FEN
 */
export class GoalCompletionChecker implements CompletionChecker {
  constructor(private goalFen: string) {}

  check(engine: LearnEngine): boolean {
    return engine.fen === this.goalFen;
  }

  getProgress(engine: LearnEngine): number {
    return this.check(engine) ? 100 : 0;
  }
}
