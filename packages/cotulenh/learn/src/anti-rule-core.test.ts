import { describe, it, expect } from 'vitest';
import { AntiRuleCore } from './anti-rule-core';
import { RED, BLUE } from '@cotulenh/core';

describe('AntiRuleCore', () => {
  // FEN rows are rank 12 down to rank 1
  // Row 6 from top = rank 7, Row 7 from top = rank 6, etc.
  // So '11/11/11/11/11/5I5/...' places Infantry at f7 (6th row from top = rank 7)

  describe('infiniteTurnFor', () => {
    it('should keep turn on RED after making moves (default behavior)', () => {
      // Infantry at f7 (6th row from top in FEN = rank 7)
      const fen = '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1';
      const core = new AntiRuleCore(fen);

      expect(core.turn()).toBe(RED);

      // Move infantry forward (f7 -> f8)
      const result = core.move({ from: 'f7', to: 'f8' });
      expect(result).not.toBeNull();

      // Turn should still be RED due to infiniteTurnFor
      expect(core.turn()).toBe(RED);
    });

    it('should allow multiple consecutive moves for RED', () => {
      // Infantry at f7
      const fen = '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1';
      const core = new AntiRuleCore(fen);

      // Move 1: f7 -> f8
      core.move({ from: 'f7', to: 'f8' });
      expect(core.turn()).toBe(RED);

      // Move 2: f8 -> f9
      core.move({ from: 'f8', to: 'f9' });
      expect(core.turn()).toBe(RED);

      // Move 3: f9 -> f10
      core.move({ from: 'f9', to: 'f10' });
      expect(core.turn()).toBe(RED);
    });

    it('should return moves for RED after multiple moves', () => {
      // Infantry at f7
      const fen = '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1';
      const core = new AntiRuleCore(fen);

      // Move 1: f7 -> f8
      core.move({ from: 'f7', to: 'f8' });

      // Should still have moves available for RED
      const moves = core.moves({ verbose: true });
      expect(moves.length).toBeGreaterThan(0);

      // Move 2: f8 -> f9
      core.move({ from: 'f8', to: 'f9' });

      // Should still have moves
      const moves2 = core.moves({ verbose: true });
      expect(moves2.length).toBeGreaterThan(0);
    });

    it('should have correct turn in FEN after moves', () => {
      const fen = '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1';
      const core = new AntiRuleCore(fen);

      // Move 1
      core.move({ from: 'f7', to: 'f8' });

      // FEN should show red's turn
      const fenAfterMove = core.fen();
      expect(fenAfterMove.split(' ')[1]).toBe('r');

      // Move 2
      core.move({ from: 'f8', to: 'f9' });

      // FEN should still show red's turn
      const fenAfterMove2 = core.fen();
      expect(fenAfterMove2.split(' ')[1]).toBe('r');
    });

    it('should keep turn on RED after undo', () => {
      const fen = '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1';
      const core = new AntiRuleCore(fen);

      core.move({ from: 'f7', to: 'f8' });
      expect(core.turn()).toBe(RED);

      core.undo();
      expect(core.turn()).toBe(RED);
    });

    it('should keep turn on RED after load', () => {
      const core = new AntiRuleCore();
      // Blue's turn in FEN, but infiniteTurnFor should override
      const newFen = '11/11/11/11/11/5I5/11/11/11/11/11/11 b - - 0 1';

      core.load(newFen);
      expect(core.turn()).toBe(RED);
    });

    it('should allow disabling infiniteTurnFor', () => {
      const fen = '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1';
      const core = new AntiRuleCore(fen, { infiniteTurnFor: null });

      expect(core.turn()).toBe(RED);

      core.move({ from: 'f7', to: 'f8' });
      // Turn should switch normally
      expect(core.turn()).toBe(BLUE);
    });

    it('should allow infiniteTurnFor BLUE', () => {
      // Blue infantry at f7, blue's turn
      const fen = '11/11/11/11/11/5i5/11/11/11/11/11/11 b - - 0 1';
      const core = new AntiRuleCore(fen, { infiniteTurnFor: BLUE });

      expect(core.turn()).toBe(BLUE);

      // Blue infantry moves toward rank 1 (f7 -> f6)
      core.move({ from: 'f7', to: 'f6' });
      expect(core.turn()).toBe(BLUE);

      core.move({ from: 'f6', to: 'f5' });
      expect(core.turn()).toBe(BLUE);
    });
  });

  describe('legalMoves option', () => {
    it('should allow illegal moves when legalMoves is false (default)', () => {
      const fen = '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1';
      const core = new AntiRuleCore(fen, { legalMoves: false });

      const result = core.move({ from: 'f7', to: 'f8' });
      expect(result).not.toBeNull();
    });
  });

  describe('commitSession with infiniteTurnFor', () => {
    it('should keep turn on RED after commitSession', () => {
      const fen = '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1';
      const core = new AntiRuleCore(fen);

      core.move({ from: 'f7', to: 'f8' }, { autoCommit: false });

      const commitResult = core.commitSession();
      expect(commitResult.success).toBe(true);
      expect(core.turn()).toBe(RED);
    });
  });
});
