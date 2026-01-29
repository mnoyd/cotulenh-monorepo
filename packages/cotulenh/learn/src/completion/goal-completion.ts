import type { LearnEngine } from '../learn-engine';
import type { CompletionChecker } from './completion-checker';

/**
 * Checks completion based on reaching a goal FEN
 */
export class GoalCompletionChecker implements CompletionChecker {
  constructor(private goalFen: string | string[]) {}

  check(engine: LearnEngine): boolean {
    const current = this.#normalizeFen(engine.fen);
    const goals = Array.isArray(this.goalFen) ? this.goalFen : [this.goalFen];
    return goals.some((goal) => current === this.#normalizeFen(goal));
  }

  getProgress(engine: LearnEngine): number {
    return this.check(engine) ? 100 : 0;
  }

  #normalizeFen(fen: string): string {
    const position = fen.split(' ')[0] ?? '';
    return position.replace(/\+/g, '');
  }
}
