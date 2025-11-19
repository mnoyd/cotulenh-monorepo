/**
 * Tests for CoTuLenh class - basic API compatibility
 */

import { describe, it, expect } from 'vitest';
import { CoTuLenh } from './cotulenh';
import { DEFAULT_POSITION } from './fen';

describe('CoTuLenh', () => {
  describe('constructor', () => {
    it('should create a new instance with default position', () => {
      const game = new CoTuLenh();
      expect(game).toBeDefined();
      expect(game.turn()).toBe('r');
    });

    it('should create a new instance with custom FEN', () => {
      const game = new CoTuLenh(DEFAULT_POSITION);
      expect(game).toBeDefined();
      expect(game.turn()).toBe('r');
    });
  });

  describe('clear', () => {
    it('should clear the board', () => {
      const game = new CoTuLenh();
      game.clear();
      expect(game.turn()).toBe('r');
    });
  });

  describe('load', () => {
    it('should load a FEN position', () => {
      const game = new CoTuLenh();
      game.load(DEFAULT_POSITION);
      expect(game.turn()).toBe('r');
    });
  });

  describe('fen', () => {
    it('should generate FEN string', () => {
      const game = new CoTuLenh();
      const fen = game.fen();
      expect(fen).toBeDefined();
      expect(typeof fen).toBe('string');
    });
  });

  describe('turn', () => {
    it('should return current turn', () => {
      const game = new CoTuLenh();
      expect(game.turn()).toBe('r');
    });
  });

  describe('isCheck', () => {
    it('should return false for starting position', () => {
      const game = new CoTuLenh();
      expect(game.isCheck()).toBe(false);
    });
  });

  describe('isCheckmate', () => {
    it('should return false for starting position', () => {
      const game = new CoTuLenh();
      expect(game.isCheckmate()).toBe(false);
    });
  });

  describe('isGameOver', () => {
    it('should return false for starting position', () => {
      const game = new CoTuLenh();
      expect(game.isGameOver()).toBe(false);
    });
  });

  describe('isDraw', () => {
    it('should return false for starting position', () => {
      const game = new CoTuLenh();
      expect(game.isDraw()).toBe(false);
    });
  });

  describe('moveNumber', () => {
    it('should return 1 for starting position', () => {
      const game = new CoTuLenh();
      expect(game.moveNumber()).toBe(1);
    });
  });

  describe('getCommanderSquare', () => {
    it('should return commander square for red', () => {
      const game = new CoTuLenh();
      const sq = game.getCommanderSquare('r');
      expect(sq).toBeGreaterThanOrEqual(-1);
    });

    it('should return commander square for blue', () => {
      const game = new CoTuLenh();
      const sq = game.getCommanderSquare('b');
      expect(sq).toBeGreaterThanOrEqual(-1);
    });
  });
});
