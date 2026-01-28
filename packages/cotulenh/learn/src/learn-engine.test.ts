import { describe, it, expect, vi } from 'vitest';
import { LearnEngine } from './learn-engine';

describe('LearnEngine', () => {
  describe('terrain-2: The River and Bridges (multi-target)', () => {
    it('should complete when all targets are visited', () => {
      const onComplete = vi.fn();
      const onStateChange = vi.fn();

      const engine = new LearnEngine({
        onComplete,
        onStateChange
      });

      // Load the first lesson
      const loaded = engine.loadLesson('terrain-2');
      expect(loaded).toBe(true);
      expect(engine.status).toBe('ready');

      // Tank and Artillery start at e5 and f5
      const tank = engine.game?.get('e5');
      const artillery = engine.game?.get('f5');
      expect(tank).toBeDefined();
      expect(artillery).toBeDefined();

      // Visit first target
      engine.makeMove('e5', 'e7');
      expect(engine.status).toBe('ready'); // Not complete yet

      // Visit second target
      engine.makeMove('f5', 'f6');
      expect(engine.status).toBe('ready'); // Still not complete

      // Visit third target
      engine.makeMove('f6', 'f7');
      expect(engine.status).toBe('completed');
      expect(onComplete).toHaveBeenCalled();
    });

    it('should allow any path to reach all targets', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });

      engine.loadLesson('terrain-2');

      // Take a detour before hitting targets
      engine.makeMove('e5', 'e6');
      expect(engine.status).toBe('ready');

      engine.makeMove('e6', 'e7');
      expect(engine.status).toBe('ready');

      // Now visit all targets
      engine.makeMove('f5', 'f6');
      engine.makeMove('f6', 'f7');
      expect(engine.status).toBe('completed');
    });
  });

  describe('terrain-3: Mixed Zones (multi-target)', () => {
    it('should complete when all targets are visited', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });

      engine.loadLesson('terrain-3');

      const navy = engine.game?.get('b6');
      const infantry = engine.game?.get('d5');
      expect(navy).toBeDefined();
      expect(infantry).toBeDefined();

      // Visit first target
      engine.makeMove('b6', 'c6');
      expect(engine.status).toBe('ready');

      // Visit second target
      engine.makeMove('d5', 'd6');
      expect(engine.status).toBe('ready');

      // Visit third target
      engine.makeMove('d6', 'e6');
      expect(engine.status).toBe('completed');
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('restart', () => {
    it('should reset the lesson to initial state', () => {
      const engine = new LearnEngine();
      engine.loadLesson('terrain-2');

      // Visit all targets to complete
      engine.makeMove('e5', 'e7');
      engine.makeMove('f5', 'f6');
      engine.makeMove('f6', 'f7');
      expect(engine.status).toBe('completed');
      expect(engine.moveCount).toBe(3);

      // Restart
      engine.restart();
      expect(engine.status).toBe('ready');
      expect(engine.moveCount).toBe(0);

      // Tank should be back at e5
      const piece = engine.game?.get('e5');
      expect(piece).toBeDefined();
    });
  });

  describe('infinite turns for learning', () => {
    it('should allow selecting and moving the same piece multiple times', () => {
      const engine = new LearnEngine();
      engine.loadLesson('terrain-2');

      // Initial state - should have moves
      const initialMoves = engine.getPossibleMoves();
      expect(initialMoves.length).toBeGreaterThan(0);

      // Move right (not toward goal)
      engine.makeMove('e5', 'e6');
      expect(engine.status).toBe('ready');

      // After first move, should still have moves available
      const movesAfterFirst = engine.getPossibleMoves();
      expect(movesAfterFirst.length).toBeGreaterThan(0);

      // The piece at g7 should be movable
      const movesFromE6 = movesAfterFirst.filter((m) => m.from === 'e6');
      expect(movesFromE6.length).toBeGreaterThan(0);

      // Move again
      engine.makeMove('e6', 'e5');
      expect(engine.status).toBe('ready');

      // Should still have moves
      const movesAfterSecond = engine.getPossibleMoves();
      expect(movesAfterSecond.length).toBeGreaterThan(0);

      // Turn should still be RED
      expect(engine.game?.turn()).toBe('r');
    });

    it('should maintain correct state for board config simulation', () => {
      const engine = new LearnEngine();
      engine.loadLesson('terrain-2');

      // Simulate what boardConfig does
      const getSimulatedBoardState = () => {
        const game = engine.game;
        if (!game) return null;
        return {
          turnColor: game.turn(),
          fen: engine.fen,
          status: engine.status,
          movesCount: engine.getPossibleMoves().length,
          fenTurn: engine.fen.split(' ')[1]
        };
      };

      // Initial state
      let state = getSimulatedBoardState();
      expect(state?.turnColor).toBe('r');
      expect(state?.fenTurn).toBe('r');
      expect(state?.movesCount).toBeGreaterThan(0);

      // After first move
      engine.makeMove('e5', 'e6');
      state = getSimulatedBoardState();
      expect(state?.turnColor).toBe('r');
      expect(state?.fenTurn).toBe('r');
      expect(state?.movesCount).toBeGreaterThan(0);
      expect(state?.status).toBe('ready');

      // After second move
      engine.makeMove('e6', 'e5');
      state = getSimulatedBoardState();
      expect(state?.turnColor).toBe('r');
      expect(state?.fenTurn).toBe('r');
      expect(state?.movesCount).toBeGreaterThan(0);
    });
  });

  describe('stars calculation', () => {
    it('should give 3 stars for optimal moves', () => {
      expect(LearnEngine.calculateStars(1, 1)).toBe(3);
      expect(LearnEngine.calculateStars(3, 3)).toBe(3);
    });

    it('should give 2 stars for slightly over optimal', () => {
      expect(LearnEngine.calculateStars(2, 1)).toBe(2);
      expect(LearnEngine.calculateStars(4, 3)).toBe(2);
    });

    it('should give 1 star for double optimal', () => {
      expect(LearnEngine.calculateStars(6, 3)).toBe(1);
    });

    it('should give 0 stars for more than double optimal', () => {
      expect(LearnEngine.calculateStars(7, 3)).toBe(0);
    });
  });

  describe('multiple targets', () => {
    it('should track visited targets', () => {
      const engine = new LearnEngine();
      engine.loadLesson('terrain-2');

      expect(engine.visitedTargets).toEqual([]);
      expect(engine.remainingTargets).toEqual(['e7', 'f6', 'f7']);

      // Visit first target
      engine.makeMove('e5', 'e7');
      expect(engine.visitedTargets).toEqual(['e7']);
      expect(engine.remainingTargets).toEqual(['f6', 'f7']);

      // Visit second target
      engine.makeMove('f5', 'f6');
      expect(engine.visitedTargets).toEqual(['e7', 'f6']);
      expect(engine.remainingTargets).toEqual(['f7']);
    });

    it('should complete only after all targets visited', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });
      engine.loadLesson('terrain-2');

      // Visit first target
      engine.makeMove('e5', 'e7');
      expect(engine.status).toBe('ready');
      expect(engine.visitedTargets).toContain('e7');

      // Visit second target
      engine.makeMove('f5', 'f6');
      expect(engine.status).toBe('ready');
      expect(engine.visitedTargets).toContain('f6');

      // Visit third target
      engine.makeMove('f6', 'f7');
      expect(engine.status).toBe('completed');
      expect(engine.visitedTargets).toContain('f7');
    });

    it('should clear visited targets on restart', () => {
      const engine = new LearnEngine();
      engine.loadLesson('terrain-2');

      engine.makeMove('e5', 'e7');
      expect(engine.visitedTargets).toEqual(['e7']);

      engine.restart();
      expect(engine.visitedTargets).toEqual([]);
      expect(engine.remainingTargets).toEqual(['e7', 'f6', 'f7']);
    });
  });
});
