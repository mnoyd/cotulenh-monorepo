import { describe, it, expect } from 'vitest';
import type { LearnEngine } from '../learn-engine';
import { GoalCompletionChecker } from './goal-completion';

const makeEngine = (fen: string) => ({ fen }) as unknown as LearnEngine;

describe('GoalCompletionChecker', () => {
  it('matches when any goal FEN is reached', () => {
    const checker = new GoalCompletionChecker([
      '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1',
      '11/11/11/11/11/11/11/11/11/11/11/11 b - - 0 1'
    ]);

    expect(checker.check(makeEngine('11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'))).toBe(true);
  });
});
