import { describe, it, expect } from 'vitest';
import { flattenPiece, extractLastMoveSquares } from './game-session-helpers';
import type { Piece, MoveResult } from '@cotulenh/core';

describe('game-session-helpers', () => {
  describe('flattenPiece', () => {
    it('should return single piece when no carrying', () => {
      const piece: Piece = {
        type: 'i',
        color: 'r'
      };
      const result = flattenPiece(piece);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'i', color: 'r' });
    });

    it('should flatten piece with carrying array', () => {
      const piece: Piece = {
        type: 'i',
        color: 'r',
        carrying: [
          { type: 't', color: 'r' },
          { type: 'a', color: 'r' }
        ]
      };
      const result = flattenPiece(piece);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'i', color: 'r', carrying: undefined });
      expect(result[1]).toEqual({ type: 't', color: 'r' });
      expect(result[2]).toEqual({ type: 'a', color: 'r' });
    });

    it('should handle empty carrying array', () => {
      const piece: Piece = {
        type: 'i',
        color: 'r',
        carrying: []
      };
      const result = flattenPiece(piece);
      expect(result).toHaveLength(1);
    });
  });

  describe('extractLastMoveSquares', () => {
    it('should return empty array for null/undefined', () => {
      expect(extractLastMoveSquares(null)).toEqual([]);
      expect(extractLastMoveSquares(undefined)).toEqual([]);
    });

    it('should return empty array for invalid objects', () => {
      expect(extractLastMoveSquares({})).toEqual([]);
      expect(extractLastMoveSquares({ from: 'a1' })).toEqual([]);
      expect(extractLastMoveSquares('invalid')).toEqual([]);
    });

    it('should extract squares from normal move', () => {
      const move: Partial<MoveResult> = {
        from: 'a1',
        to: 'a2',
        flags: ''
      };
      const result = extractLastMoveSquares(move);
      expect(result).toEqual(['a1', 'a2']);
    });

    it('should extract squares from deploy move with single destination', () => {
      const move: Partial<MoveResult> = {
        from: 'a1',
        to: 'a2',
        flags: 'd',
        isDeploy: true
      };
      const result = extractLastMoveSquares(move);
      expect(result).toEqual(['a1', 'a2']);
    });

    it('should extract squares from deploy move with Map destination', () => {
      const destinations = new Map<string, Piece>([
        ['a2', { type: 'i', color: 'r' }],
        ['a3', { type: 'i', color: 'r' }]
      ]);
      const move: Partial<MoveResult> = {
        from: 'a1',
        to: destinations,
        flags: 'd',
        isDeploy: true
      };
      const result = extractLastMoveSquares(move);
      expect(result).toContain('a1');
      expect(result).toContain('a2');
      expect(result).toContain('a3');
      expect(result).toHaveLength(3);
    });
  });
});
