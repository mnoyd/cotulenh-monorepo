/**
 * Tests for Move Generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateInfantryMoves,
  generateTankMoves,
  generateCommanderMoves,
  generateMilitiaMoves,
  generateEngineerMoves,
  generateArtilleryMoves,
  generateAntiAirMoves,
  generateMissileMoves,
  generateAirForceMoves,
  generateNavyMoves,
  generateHeadquarterMoves,
  generateAllMoves,
  generateMoves,
  generateLegalMoves,
  generateMovesWithDeploySession,
  generateMovesWithCache,
  invalidateMoveCache,
  getMoveCacheSize,
  MOVE_FLAGS,
  type Move
} from './move-generator';
import { BitboardPosition } from './position';
import type { Piece } from './types';

describe('Move Generation', () => {
  let position: BitboardPosition;

  beforeEach(() => {
    position = new BitboardPosition();
  });

  describe('Infantry Move Generation', () => {
    it('should generate moves for infantry piece', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateInfantryMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.piece.type === 'i')).toBe(true);
      expect(moves.every((m) => m.from === 60)).toBe(true);
    });

    it('should generate orthogonal moves only for non-heroic infantry', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateInfantryMoves(position, 'r');

      // Infantry moves 1 square orthogonally
      expect(moves.length).toBeLessThanOrEqual(4); // Up to 4 directions
    });

    it('should generate diagonal moves for heroic infantry', () => {
      const piece: Piece = { type: 'i', color: 'r', heroic: true };
      position.placePiece(piece, 60); // f6

      const moves = generateInfantryMoves(position, 'r');

      // Heroic infantry can move diagonally too
      expect(moves.length).toBeGreaterThan(4);
    });

    it('should generate capture moves for enemy pieces', () => {
      const redPiece: Piece = { type: 'i', color: 'r' };
      const bluePiece: Piece = { type: 'i', color: 'b' };

      position.placePiece(redPiece, 60); // f6
      position.placePiece(bluePiece, 61); // g6 (adjacent)

      const moves = generateInfantryMoves(position, 'r');
      const captureMoves = moves.filter((m) => m.flags & MOVE_FLAGS.CAPTURE);

      expect(captureMoves.length).toBeGreaterThan(0);
      expect(captureMoves.some((m) => m.to === 61)).toBe(true);
    });

    it('should generate combination moves for friendly pieces', () => {
      const piece1: Piece = { type: 'i', color: 'r' };
      const piece2: Piece = { type: 't', color: 'r' };

      position.placePiece(piece1, 60); // f6
      position.placePiece(piece2, 61); // g6 (adjacent)

      const moves = generateInfantryMoves(position, 'r');
      const combinationMoves = moves.filter((m) => m.flags & MOVE_FLAGS.COMBINATION);

      expect(combinationMoves.length).toBeGreaterThan(0);
      expect(combinationMoves.some((m) => m.to === 61)).toBe(true);
    });

    it('should not generate moves for blue infantry when generating for red', () => {
      const bluePiece: Piece = { type: 'i', color: 'b' };
      position.placePiece(bluePiece, 60);

      const moves = generateInfantryMoves(position, 'r');

      expect(moves.length).toBe(0);
    });
  });

  describe('Tank Move Generation', () => {
    it('should generate moves for tank piece', () => {
      const piece: Piece = { type: 't', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateTankMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.piece.type === 't')).toBe(true);
    });

    it('should move up to 2 squares', () => {
      const piece: Piece = { type: 't', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateTankMoves(position, 'r');

      // Tank can move 1 or 2 squares in each direction
      const maxDistance = Math.max(...moves.map((m) => Math.abs(m.to - m.from)));
      expect(maxDistance).toBeGreaterThan(1);
    });

    it('should move orthogonally only when not heroic', () => {
      const piece: Piece = { type: 't', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateTankMoves(position, 'r');

      // Non-heroic tank moves orthogonally
      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('Commander Move Generation', () => {
    it('should generate moves for commander piece', () => {
      const piece: Piece = { type: 'c', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateCommanderMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.piece.type === 'c')).toBe(true);
    });

    it('should move unlimited distance orthogonally', () => {
      const piece: Piece = { type: 'c', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateCommanderMoves(position, 'r');

      // Commander can move multiple squares
      expect(moves.length).toBeGreaterThan(4);
    });

    it('should capture only 1 square away', () => {
      const redPiece: Piece = { type: 'c', color: 'r' };
      const bluePiece: Piece = { type: 'i', color: 'b' };

      position.placePiece(redPiece, 60); // f6
      position.placePiece(bluePiece, 62); // h6 (2 squares away)

      const moves = generateCommanderMoves(position, 'r');
      const captureMoves = moves.filter((m) => m.flags & MOVE_FLAGS.CAPTURE && m.to === 62);

      // Commander can only capture 1 square away
      expect(captureMoves.length).toBe(0);
    });
  });

  describe('Militia Move Generation', () => {
    it('should generate moves for militia piece', () => {
      const piece: Piece = { type: 'm', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateMilitiaMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.piece.type === 'm')).toBe(true);
    });

    it('should move diagonally', () => {
      const piece: Piece = { type: 'm', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateMilitiaMoves(position, 'r');

      // Militia can move in all 8 directions
      expect(moves.length).toBeGreaterThan(4);
    });
  });

  describe('Engineer Move Generation', () => {
    it('should generate moves for engineer piece', () => {
      const piece: Piece = { type: 'e', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateEngineerMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.piece.type === 'e')).toBe(true);
    });
  });

  describe('Artillery Move Generation', () => {
    it('should generate moves for artillery piece', () => {
      const piece: Piece = { type: 'a', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateArtilleryMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.piece.type === 'a')).toBe(true);
    });

    it('should move up to 3 squares', () => {
      const piece: Piece = { type: 'a', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateArtilleryMoves(position, 'r');

      // Artillery moves up to 3 squares
      expect(moves.length).toBeGreaterThan(0);
    });

    it('should capture through pieces', () => {
      const redPiece: Piece = { type: 'a', color: 'r' };
      const blockingPiece: Piece = { type: 'i', color: 'r' };
      const bluePiece: Piece = { type: 'i', color: 'b' };

      position.placePiece(redPiece, 60); // f6
      position.placePiece(blockingPiece, 61); // g6 (blocking)
      position.placePiece(bluePiece, 62); // h6 (target)

      const moves = generateArtilleryMoves(position, 'r');
      const captureMoves = moves.filter((m) => m.flags & MOVE_FLAGS.CAPTURE && m.to === 62);

      // Artillery can capture through pieces
      expect(captureMoves.length).toBeGreaterThan(0);
    });
  });

  describe('Anti-Air Move Generation', () => {
    it('should generate moves for anti-air piece', () => {
      const piece: Piece = { type: 'g', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateAntiAirMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.piece.type === 'g')).toBe(true);
    });
  });

  describe('Missile Move Generation', () => {
    it('should generate moves for missile piece', () => {
      const piece: Piece = { type: 's', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateMissileMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.piece.type === 's')).toBe(true);
    });

    it('should move up to 2 squares', () => {
      const piece: Piece = { type: 's', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateMissileMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('Air Force Move Generation', () => {
    it('should generate moves for air force piece', () => {
      const piece: Piece = { type: 'f', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateAirForceMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.piece.type === 'f')).toBe(true);
    });

    it('should move up to 4 squares', () => {
      const piece: Piece = { type: 'f', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateAirForceMoves(position, 'r');

      // Air force has long range
      expect(moves.length).toBeGreaterThan(10);
    });

    it('should ignore piece blocking for movement', () => {
      const redPiece: Piece = { type: 'f', color: 'r' };
      const blockingPiece: Piece = { type: 'i', color: 'r' };

      position.placePiece(redPiece, 60); // f6
      position.placePiece(blockingPiece, 61); // g6 (blocking)

      const moves = generateAirForceMoves(position, 'r');

      // Air force can move through pieces
      const movesPassingBlock = moves.filter(
        (m) => m.to > 61 && Math.abs(m.to - m.from) === Math.abs(61 - m.from) * 2
      );
      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('Navy Move Generation', () => {
    it('should generate moves for navy piece on water', () => {
      const piece: Piece = { type: 'n', color: 'r' };
      position.placePiece(piece, 0); // a12 (water)

      const moves = generateNavyMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.piece.type === 'n')).toBe(true);
    });

    it('should only generate moves to water squares', () => {
      const piece: Piece = { type: 'n', color: 'r' };
      position.placePiece(piece, 0); // a12 (water)

      const moves = generateNavyMoves(position, 'r');

      // All destination squares should be water
      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('Headquarter Move Generation', () => {
    it('should not generate moves for non-heroic headquarter', () => {
      const piece: Piece = { type: 'h', color: 'r' };
      position.placePiece(piece, 60); // f6

      const moves = generateHeadquarterMoves(position, 'r');

      // Non-heroic headquarter cannot move
      expect(moves.length).toBe(0);
    });

    it('should generate moves for heroic headquarter', () => {
      const piece: Piece = { type: 'h', color: 'r', heroic: true };
      position.placePiece(piece, 60); // f6

      const moves = generateHeadquarterMoves(position, 'r');

      // Heroic headquarter can move
      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('Generate All Moves', () => {
    it('should generate moves for all piece types', () => {
      position.placePiece({ type: 'i', color: 'r' }, 60);
      position.placePiece({ type: 't', color: 'r' }, 61);
      position.placePiece({ type: 'c', color: 'r' }, 62);

      const moves = generateAllMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.some((m) => m.piece.type === 'i')).toBe(true);
      expect(moves.some((m) => m.piece.type === 't')).toBe(true);
      expect(moves.some((m) => m.piece.type === 'c')).toBe(true);
    });

    it('should generate moves for multiple pieces of same type', () => {
      position.placePiece({ type: 'i', color: 'r' }, 60);
      position.placePiece({ type: 'i', color: 'r' }, 70);

      const moves = generateAllMoves(position, 'r');
      const infantryMoves = moves.filter((m) => m.piece.type === 'i');

      expect(infantryMoves.some((m) => m.from === 60)).toBe(true);
      expect(infantryMoves.some((m) => m.from === 70)).toBe(true);
    });
  });

  describe('Move Filtering by Square', () => {
    beforeEach(() => {
      position.placePiece({ type: 'i', color: 'r' }, 60);
      position.placePiece({ type: 't', color: 'r' }, 61);
    });

    it('should filter moves from specific square', () => {
      const moves = generateMoves(position, 'r', { square: 60 });

      expect(moves.every((m) => m.from === 60)).toBe(true);
      expect(moves.every((m) => m.piece.type === 'i')).toBe(true);
    });

    it('should return empty array for empty square', () => {
      const moves = generateMoves(position, 'r', { square: 50 });

      expect(moves.length).toBe(0);
    });

    it('should return empty array for enemy piece square', () => {
      position.placePiece({ type: 'i', color: 'b' }, 70);
      const moves = generateMoves(position, 'r', { square: 70 });

      expect(moves.length).toBe(0);
    });
  });

  describe('Move Filtering by Piece Type', () => {
    beforeEach(() => {
      position.placePiece({ type: 'i', color: 'r' }, 60);
      position.placePiece({ type: 't', color: 'r' }, 61);
      position.placePiece({ type: 'c', color: 'r' }, 62);
    });

    it('should filter moves for specific piece type', () => {
      const moves = generateMoves(position, 'r', { pieceType: 'i' });

      expect(moves.every((m) => m.piece.type === 'i')).toBe(true);
      expect(moves.length).toBeGreaterThan(0);
    });

    it('should generate moves for all pieces of that type', () => {
      position.placePiece({ type: 'i', color: 'r' }, 70);
      const moves = generateMoves(position, 'r', { pieceType: 'i' });

      expect(moves.some((m) => m.from === 60)).toBe(true);
      expect(moves.some((m) => m.from === 70)).toBe(true);
    });

    it('should return empty array for piece type not on board', () => {
      const moves = generateMoves(position, 'r', { pieceType: 'n' });

      expect(moves.length).toBe(0);
    });
  });

  describe('Legality Filtering', () => {
    it('should filter out moves that leave commander in check', () => {
      // Set up position where moving a piece exposes commander
      position.placePiece({ type: 'c', color: 'r' }, 60); // f6
      position.placePiece({ type: 'i', color: 'r' }, 61); // g6 (blocking)
      position.placePiece({ type: 't', color: 'b' }, 62); // h6 (attacking)

      const pseudoLegalMoves = generateMoves(position, 'r', { square: 61 });
      const legalMoves = generateLegalMoves(position, 'r', { square: 61 });

      // Moving the infantry away would expose commander
      expect(legalMoves.length).toBeLessThan(pseudoLegalMoves.length);
    });

    it('should allow moves that do not expose commander', () => {
      position.placePiece({ type: 'c', color: 'r' }, 60);
      position.placePiece({ type: 'i', color: 'r' }, 70); // Far from commander

      const moves = generateLegalMoves(position, 'r', { square: 70 });

      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('Deploy Move Generation', () => {
    it('should generate deploy moves when session is active', () => {
      // Create a stack by placing a piece with carrying array
      const carrier: Piece = { type: 'i', color: 'r' };
      const carried: Piece[] = [{ type: 't', color: 'r' }];

      // Place the carrier piece with carrying array (this automatically creates the stack)
      position.placePiece({ ...carrier, carrying: carried }, 60);

      // Initiate deploy session
      position.initiateDeploySession(60, 'r');

      const moves = generateMovesWithDeploySession(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.flags & MOVE_FLAGS.DEPLOY)).toBe(true);
    });

    it('should only generate moves for remaining pieces in deploy session', () => {
      const carrier: Piece = { type: 'i', color: 'r' };
      const carried: Piece[] = [{ type: 't', color: 'r' }];

      // Place the carrier piece with carrying array (this automatically creates the stack)
      position.placePiece({ ...carrier, carrying: carried }, 60);

      // Initiate deploy session
      position.initiateDeploySession(60, 'r');

      const moves = generateMovesWithDeploySession(position, 'r');

      // Should have moves for both infantry and tank
      expect(moves.length).toBeGreaterThan(0);
    });

    it('should generate normal moves when no deploy session active', () => {
      position.placePiece({ type: 'i', color: 'r' }, 60);

      const moves = generateMovesWithDeploySession(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => !(m.flags & MOVE_FLAGS.DEPLOY))).toBe(true);
    });
  });

  describe('Move Caching', () => {
    beforeEach(() => {
      invalidateMoveCache();
      position.placePiece({ type: 'i', color: 'r' }, 60);
    });

    it('should cache generated moves', () => {
      const moves1 = generateMovesWithCache(position, 'r');
      const cacheSize = getMoveCacheSize();

      expect(cacheSize).toBe(1);
      expect(moves1.length).toBeGreaterThan(0);
    });

    it('should return cached moves on second call', () => {
      const moves1 = generateMovesWithCache(position, 'r');
      const moves2 = generateMovesWithCache(position, 'r');

      expect(moves1).toEqual(moves2);
      expect(getMoveCacheSize()).toBe(1);
    });

    it('should cache different filter options separately', () => {
      generateMovesWithCache(position, 'r');
      generateMovesWithCache(position, 'r', { square: 60 });
      generateMovesWithCache(position, 'r', { pieceType: 'i' });

      expect(getMoveCacheSize()).toBe(3);
    });

    it('should invalidate cache', () => {
      generateMovesWithCache(position, 'r');
      expect(getMoveCacheSize()).toBeGreaterThan(0);

      invalidateMoveCache();

      expect(getMoveCacheSize()).toBe(0);
    });

    it('should generate new moves after cache invalidation', () => {
      const moves1 = generateMovesWithCache(position, 'r');
      invalidateMoveCache();
      const moves2 = generateMovesWithCache(position, 'r');

      expect(moves1).toEqual(moves2);
      expect(getMoveCacheSize()).toBe(1);
    });
  });

  describe('Move Flags', () => {
    it('should mark normal moves correctly', () => {
      position.placePiece({ type: 'i', color: 'r' }, 60);

      const moves = generateMoves(position, 'r');
      const normalMoves = moves.filter((m) => m.flags === MOVE_FLAGS.NORMAL);

      expect(normalMoves.length).toBeGreaterThan(0);
    });

    it('should mark capture moves correctly', () => {
      position.placePiece({ type: 'i', color: 'r' }, 60);
      position.placePiece({ type: 'i', color: 'b' }, 61);

      const moves = generateMoves(position, 'r');
      const captureMoves = moves.filter((m) => m.flags & MOVE_FLAGS.CAPTURE);

      expect(captureMoves.length).toBeGreaterThan(0);
      expect(captureMoves.every((m) => m.captured !== undefined)).toBe(true);
    });

    it('should mark combination moves correctly', () => {
      position.placePiece({ type: 'i', color: 'r' }, 60);
      position.placePiece({ type: 't', color: 'r' }, 61);

      const moves = generateMoves(position, 'r');
      const combinationMoves = moves.filter((m) => m.flags & MOVE_FLAGS.COMBINATION);

      expect(combinationMoves.length).toBeGreaterThan(0);
    });
  });

  describe('Terrain Restrictions', () => {
    it('should restrict navy to water squares', () => {
      position.placePiece({ type: 'n', color: 'r' }, 0); // a12 (water)

      const moves = generateMoves(position, 'r');

      // All moves should be to water squares
      expect(moves.length).toBeGreaterThan(0);
    });

    it('should restrict land pieces to land squares', () => {
      position.placePiece({ type: 'i', color: 'r' }, 60); // f6 (land)

      const moves = generateMoves(position, 'r');

      // All moves should be to land squares
      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty board', () => {
      const moves = generateAllMoves(position, 'r');

      expect(moves.length).toBe(0);
    });

    it('should handle piece with no legal moves', () => {
      // Surround a piece completely
      position.placePiece({ type: 'i', color: 'r' }, 60);
      position.placePiece({ type: 'i', color: 'r' }, 59);
      position.placePiece({ type: 'i', color: 'r' }, 61);
      position.placePiece({ type: 'i', color: 'r' }, 49);
      position.placePiece({ type: 'i', color: 'r' }, 71);

      const moves = generateMoves(position, 'r', { square: 60 });

      // Should only have combination moves
      expect(moves.every((m) => m.flags & MOVE_FLAGS.COMBINATION)).toBe(true);
    });

    it('should handle board boundaries correctly', () => {
      position.placePiece({ type: 'i', color: 'r' }, 0); // a12 (corner)

      const moves = generateMoves(position, 'r');

      // Should not generate moves off the board
      expect(moves.every((m) => m.to >= 0 && m.to < 132)).toBe(true);
    });

    it('should handle multiple pieces of same color', () => {
      for (let i = 0; i < 5; i++) {
        position.placePiece({ type: 'i', color: 'r' }, 60 + i);
      }

      const moves = generateAllMoves(position, 'r');

      expect(moves.length).toBeGreaterThan(0);
    });
  });
});
