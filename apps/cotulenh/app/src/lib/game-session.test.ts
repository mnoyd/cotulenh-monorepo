import { describe, it, expect, vi } from 'vitest';

// Mock dependencies that require Svelte component preprocessing
vi.mock('svelte-sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() }
}));

// Mock perf utilities that depend on window.localStorage
vi.mock('@cotulenh/common', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    perfStart: () => () => {},
    perfTimeSync: (_label: string, fn: () => unknown) => fn(),
    perfStartMoveFlow: () => {},
    perfMarkMoveFlow: () => {},
    perfEndMoveFlow: () => {},
  };
});

vi.mock('$lib/utils/audio', () => ({
  playSound: vi.fn()
}));

vi.mock('$lib/stores/settings', () => ({
  loadSettings: () => ({ showDeployButtons: true, autoCompleteDeploy: false })
}));

vi.mock('$lib/i18n/index.svelte', () => ({
  t: (key: string) => key
}));

vi.mock('$lib/debug', () => ({
  logRender: vi.fn()
}));

import { GameSession } from './game-session.svelte';

describe('GameSession', () => {
  describe('onMove callback with SAN', () => {
    it('does not fire onMove callback for applyMove (remote move path)', () => {
      const session = new GameSession();
      const onMoveSpy = vi.fn();
      session.onMove = onMoveSpy;

      // Get available moves and make one
      const moves = session.possibleMoves;
      expect(moves.length).toBeGreaterThan(0);

      // Make first available move using applyMove with SAN
      const firstMove = moves[0];
      const result = session.applyMove(firstMove.san);
      // applyMove does NOT fire onMove (by design - remote moves)
      expect(onMoveSpy).not.toHaveBeenCalled();
      expect(result).not.toBeNull();
    });

    it('passes SAN string to onMove callback on local board move', () => {
      const session = new GameSession();
      const onMoveSpy = vi.fn();
      session.onMove = onMoveSpy;

      const moves = session.possibleMoves;
      expect(moves.length).toBeGreaterThan(0);
      const firstMove = moves[0];

      const boardConfig = session.boardConfig;
      boardConfig.movable.events.after(
        { square: firstMove.from },
        { square: firstMove.to }
      );

      expect(onMoveSpy).toHaveBeenCalledTimes(1);
      expect(onMoveSpy).toHaveBeenCalledWith(firstMove.san);
    });

    it('allows callbacks with fewer parameters (backward compat)', () => {
      const session = new GameSession();
      // TypeScript allows assigning () => void to (san: string) => void
      const callback = vi.fn();
      session.onMove = callback;
      // Just verifying the assignment works without error
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('applyMove', () => {
    it('applies a valid SAN move and updates state', () => {
      const session = new GameSession();
      const initialFen = session.fen;

      // Get a valid move SAN
      const moves = session.possibleMoves;
      expect(moves.length).toBeGreaterThan(0);
      const san = moves[0].san;

      const result = session.applyMove(san);

      expect(result).not.toBeNull();
      expect(result!.san).toBe(san);
      expect(session.fen).not.toBe(initialFen);
      expect(session.history).toHaveLength(1);
      expect(session.history[0].san).toBe(san);
    });

    it('returns null for invalid SAN', () => {
      const session = new GameSession();

      const result = session.applyMove('invalid-move');

      expect(result).toBeNull();
      expect(session.history).toHaveLength(0);
    });

    it('does NOT fire onMove callback (prevents broadcast loop)', () => {
      const session = new GameSession();
      const onMoveSpy = vi.fn();
      session.onMove = onMoveSpy;

      const moves = session.possibleMoves;
      session.applyMove(moves[0].san);

      expect(onMoveSpy).not.toHaveBeenCalled();
    });

    it('bumps version on successful move', () => {
      const session = new GameSession();

      const fenBefore = session.fen;
      const moves = session.possibleMoves;
      session.applyMove(moves[0].san);

      // Version bump causes reactive updates - fen should have changed
      expect(session.fen).not.toBe(fenBefore);
    });

    it('adds move to history', () => {
      const session = new GameSession();

      const moves = session.possibleMoves;
      session.applyMove(moves[0].san);

      expect(session.history).toHaveLength(1);

      // Make another move
      const moves2 = session.possibleMoves;
      session.applyMove(moves2[0].san);

      expect(session.history).toHaveLength(2);
    });

    it('returns null without changing state for invalid move', () => {
      const session = new GameSession();
      const initialFen = session.fen;
      const initialHistoryLength = session.history.length;

      const result = session.applyMove('Zz9');

      expect(result).toBeNull();
      expect(session.fen).toBe(initialFen);
      expect(session.history).toHaveLength(initialHistoryLength);
    });
  });

  describe('game getter', () => {
    it('exposes the game engine', () => {
      const session = new GameSession();

      const game = session.game;

      expect(game).toBeDefined();
      expect(typeof game.fen).toBe('function');
      expect(typeof game.pgn).toBe('function');
      expect(typeof game.isGameOver).toBe('function');
    });

    it('reflects current game state', () => {
      const session = new GameSession();

      expect(session.game.fen()).toBe(session.fen);
      expect(session.game.isGameOver()).toBe(false);
    });
  });
});
