import { describe, it, expect, vi } from 'vitest';
import { LearnEngine } from './learn-engine';
import { basicsLessons } from './lessons/basics';

// Helper to create a test lesson with multiple targets
const multiTargetLesson = {
  ...basicsLessons[0],
  id: 'test-multi-target',
  targetSquares: ['f8', 'g8'] as const,
  instruction: 'Visit both f8 and g8 to complete.'
};

describe('LearnEngine', () => {
  describe('basics-1: Moving Infantry (multi-target)', () => {
    it('should complete when all targets are visited', () => {
      const onComplete = vi.fn();
      const onStateChange = vi.fn();

      const engine = new LearnEngine({
        onComplete,
        onStateChange
      });

      // Load the first lesson
      const loaded = engine.loadLesson('basics-1');
      expect(loaded).toBe(true);
      expect(engine.status).toBe('ready');

      // Infantry is at f7, targets are f8, f9, f10
      const piece = engine.game?.get('f7');
      expect(piece).toBeDefined();
      expect(piece?.type).toBe('i'); // Infantry

      // Visit first target
      engine.makeMove('f7', 'f8');
      expect(engine.status).toBe('ready'); // Not complete yet

      // Visit second target
      engine.makeMove('f8', 'f9');
      expect(engine.status).toBe('ready'); // Still not complete

      // Visit third target
      engine.makeMove('f9', 'f10');
      expect(engine.status).toBe('completed');
      expect(onComplete).toHaveBeenCalled();
    });

    it('should allow any path to reach all targets', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });

      engine.loadLesson('basics-1');

      // Take a detour before hitting targets
      engine.makeMove('f7', 'g7');
      expect(engine.status).toBe('ready');

      engine.makeMove('g7', 'f7');
      expect(engine.status).toBe('ready');

      // Now visit all targets
      engine.makeMove('f7', 'f8');
      engine.makeMove('f8', 'f9');
      engine.makeMove('f9', 'f10');
      expect(engine.status).toBe('completed');
    });
  });

  describe('basics-2: Commander Movement (multi-target)', () => {
    it('should complete when all targets are visited', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });

      engine.loadLesson('basics-2');

      // Commander at f7, targets are f8, g9
      const commander = engine.game?.get('f7');
      expect(commander?.type).toBe('c');
      expect(commander?.color).toBe('r');

      // Visit first target
      engine.makeMove('f7', 'f8');
      expect(engine.status).toBe('ready');

      // Move toward second target
      engine.makeMove('f8', 'g8');
      expect(engine.status).toBe('ready');

      // Visit second target
      engine.makeMove('g8', 'g9');
      expect(engine.status).toBe('completed');
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('restart', () => {
    it('should reset the lesson to initial state', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1');

      // Visit all targets to complete
      engine.makeMove('f7', 'f8');
      engine.makeMove('f8', 'f9');
      engine.makeMove('f9', 'f10');
      expect(engine.status).toBe('completed');
      expect(engine.moveCount).toBe(3);

      // Restart
      engine.restart();
      expect(engine.status).toBe('ready');
      expect(engine.moveCount).toBe(0);

      // Infantry should be back at f7
      const piece = engine.game?.get('f7');
      expect(piece?.type).toBe('i');
    });
  });

  describe('infinite turns for learning', () => {
    it('should allow selecting and moving the same piece multiple times', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1');

      // Initial state - should have moves
      const initialMoves = engine.getPossibleMoves();
      expect(initialMoves.length).toBeGreaterThan(0);

      // Move right (not toward goal)
      engine.makeMove('f7', 'g7');
      expect(engine.status).toBe('ready');

      // After first move, should still have moves available
      const movesAfterFirst = engine.getPossibleMoves();
      expect(movesAfterFirst.length).toBeGreaterThan(0);

      // The piece at g7 should be movable
      const movesFromG7 = movesAfterFirst.filter((m) => m.from === 'g7');
      expect(movesFromG7.length).toBeGreaterThan(0);

      // Move again
      engine.makeMove('g7', 'h7');
      expect(engine.status).toBe('ready');

      // Should still have moves
      const movesAfterSecond = engine.getPossibleMoves();
      expect(movesAfterSecond.length).toBeGreaterThan(0);

      // Turn should still be RED
      expect(engine.game?.turn()).toBe('r');
    });

    it('should maintain correct state for board config simulation', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1');

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
      engine.makeMove('f7', 'g7');
      state = getSimulatedBoardState();
      expect(state?.turnColor).toBe('r');
      expect(state?.fenTurn).toBe('r');
      expect(state?.movesCount).toBeGreaterThan(0);
      expect(state?.status).toBe('ready');

      // After second move
      engine.makeMove('g7', 'h7');
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
      engine.loadLesson('basics-1');

      expect(engine.visitedTargets).toEqual([]);
      expect(engine.remainingTargets).toEqual(['f8', 'f9', 'f10']);

      // Visit first target
      engine.makeMove('f7', 'f8');
      expect(engine.visitedTargets).toEqual(['f8']);
      expect(engine.remainingTargets).toEqual(['f9', 'f10']);

      // Visit second target
      engine.makeMove('f8', 'f9');
      expect(engine.visitedTargets).toEqual(['f8', 'f9']);
      expect(engine.remainingTargets).toEqual(['f10']);
    });

    it('should complete only after all targets visited', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });
      engine.loadLesson('basics-3'); // Militia with targets g8, h9

      // Visit first target
      engine.makeMove('f7', 'g8');
      expect(engine.status).toBe('ready');
      expect(engine.visitedTargets).toContain('g8');

      // Visit second target
      engine.makeMove('g8', 'h9');
      expect(engine.status).toBe('completed');
      expect(engine.visitedTargets).toContain('h9');
    });

    it('should clear visited targets on restart', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1');

      engine.makeMove('f7', 'f8');
      expect(engine.visitedTargets).toEqual(['f8']);

      engine.restart();
      expect(engine.visitedTargets).toEqual([]);
      expect(engine.remainingTargets).toEqual(['f8', 'f9', 'f10']);
    });
  });
});
