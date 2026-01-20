import { describe, it, expect, vi } from 'vitest';
import { LearnEngine } from './learn-engine';

describe('LearnEngine', () => {
  describe('basics-1: Moving Infantry', () => {
    it('should complete when infantry moves forward one square', () => {
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

      // Infantry is at f7, goal is f8
      const piece = engine.game?.get('f7');
      expect(piece).toBeDefined();
      expect(piece?.type).toBe('i'); // Infantry

      // Make the correct move: f7 -> f8
      const success = engine.makeMove('f7', 'f8');
      expect(success).toBe(true);

      // Check lesson completed
      expect(engine.status).toBe('completed');
      expect(onComplete).toHaveBeenCalled();
      expect(onComplete.mock.calls[0][0].stars).toBe(3); // Optimal in 1 move
    });

    it('should still complete with more moves (but fewer stars)', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });

      engine.loadLesson('basics-1');

      // Move right first (not optimal)
      engine.makeMove('f7', 'g7');
      expect(engine.status).toBe('ready'); // Not complete yet

      // Move up
      engine.makeMove('g7', 'g8');
      expect(engine.status).toBe('ready'); // Still not at goal

      // Move left to reach f8 goal
      engine.makeMove('g8', 'f8');
      expect(engine.status).toBe('completed');

      // 3 moves instead of optimal 1, should get fewer stars
      const result = onComplete.mock.calls[0][0];
      expect(result.moveCount).toBe(3);
    });
  });

  describe('basics-2: Capturing Pieces', () => {
    it('should complete when capturing enemy infantry', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });

      engine.loadLesson('basics-2');

      // Red infantry at f7, blue infantry at f8
      // Goal: Red infantry at f8 (capturing blue)
      const redInfantry = engine.game?.get('f7');
      expect(redInfantry?.type).toBe('i');
      expect(redInfantry?.color).toBe('r');

      const blueInfantry = engine.game?.get('f8');
      expect(blueInfantry?.type).toBe('i');
      expect(blueInfantry?.color).toBe('b');

      // Capture! f7 -> f8
      engine.makeMove('f7', 'f8');
      expect(engine.status).toBe('completed');
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('restart', () => {
    it('should reset the lesson to initial state', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1');

      // Make a move
      engine.makeMove('f7', 'f8');
      expect(engine.status).toBe('completed');
      expect(engine.moveCount).toBe(1);

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
});
