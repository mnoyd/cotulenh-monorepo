import { describe, it, expect, beforeEach } from 'vitest';
import { BitboardPosition } from './position';
import { isSet, popCount, EMPTY } from './bitboard';
import type { Piece } from './types';

describe('BitboardPosition', () => {
  let position: BitboardPosition;

  beforeEach(() => {
    position = new BitboardPosition();
  });

  describe('Initialization', () => {
    it('should initialize with empty bitboards', () => {
      expect(popCount(position.occupied)).toBe(0);
      expect(popCount(position.redPieces)).toBe(0);
      expect(popCount(position.bluePieces)).toBe(0);
      expect(popCount(position.commanders)).toBe(0);
      expect(popCount(position.infantry)).toBe(0);
    });

    it('should initialize with empty maps', () => {
      expect(position.positionCount.size).toBe(0);
      expect(position.header.size).toBe(0);
      expect(position.comments.size).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear all bitboards', () => {
      // Place some pieces
      const piece: Piece = { type: 'i', color: 'r' };
      position.placePiece(piece, 0);
      position.placePiece(piece, 10);

      // Clear
      position.clear();

      // Verify all empty
      expect(popCount(position.occupied)).toBe(0);
      expect(popCount(position.redPieces)).toBe(0);
      expect(popCount(position.infantry)).toBe(0);
    });

    it('should clear all maps', () => {
      position.positionCount.set('test', 1);
      position.header.set('Event', 'Test');
      position.comments.set('0', 'Comment');

      position.clear();

      expect(position.positionCount.size).toBe(0);
      expect(position.header.size).toBe(0);
      expect(position.comments.size).toBe(0);
    });
  });

  describe('placePiece()', () => {
    it('should place a red infantry piece', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      position.placePiece(piece, 5);

      expect(isSet(position.infantry, 5)).toBe(true);
      expect(isSet(position.redPieces, 5)).toBe(true);
      expect(isSet(position.occupied, 5)).toBe(true);
      expect(isSet(position.bluePieces, 5)).toBe(false);
    });

    it('should place a blue commander piece', () => {
      const piece: Piece = { type: 'c', color: 'b' };
      position.placePiece(piece, 10);

      expect(isSet(position.commanders, 10)).toBe(true);
      expect(isSet(position.bluePieces, 10)).toBe(true);
      expect(isSet(position.occupied, 10)).toBe(true);
      expect(isSet(position.redPieces, 10)).toBe(false);
    });

    it('should place a heroic piece', () => {
      const piece: Piece = { type: 't', color: 'r', heroic: true };
      position.placePiece(piece, 20);

      expect(isSet(position.tanks, 20)).toBe(true);
      expect(isSet(position.redPieces, 20)).toBe(true);
      expect(isSet(position.heroic, 20)).toBe(true);
    });

    it('should place multiple pieces', () => {
      position.placePiece({ type: 'i', color: 'r' }, 0);
      position.placePiece({ type: 't', color: 'b' }, 1);
      position.placePiece({ type: 'c', color: 'r' }, 2);

      expect(popCount(position.occupied)).toBe(3);
      expect(popCount(position.redPieces)).toBe(2);
      expect(popCount(position.bluePieces)).toBe(1);
    });

    it('should place all piece types', () => {
      const pieceTypes: Array<{ type: any; square: number }> = [
        { type: 'c', square: 0 },
        { type: 'i', square: 1 },
        { type: 't', square: 2 },
        { type: 'm', square: 3 },
        { type: 'e', square: 4 },
        { type: 'a', square: 5 },
        { type: 'g', square: 6 },
        { type: 's', square: 7 },
        { type: 'f', square: 8 },
        { type: 'n', square: 9 },
        { type: 'h', square: 10 }
      ];

      for (const { type, square } of pieceTypes) {
        position.placePiece({ type, color: 'r' }, square);
      }

      expect(popCount(position.occupied)).toBe(11);
      expect(isSet(position.commanders, 0)).toBe(true);
      expect(isSet(position.infantry, 1)).toBe(true);
      expect(isSet(position.tanks, 2)).toBe(true);
      expect(isSet(position.militia, 3)).toBe(true);
      expect(isSet(position.engineers, 4)).toBe(true);
      expect(isSet(position.artillery, 5)).toBe(true);
      expect(isSet(position.antiAir, 6)).toBe(true);
      expect(isSet(position.missiles, 7)).toBe(true);
      expect(isSet(position.airForce, 8)).toBe(true);
      expect(isSet(position.navy, 9)).toBe(true);
      expect(isSet(position.headquarters, 10)).toBe(true);
    });
  });

  describe('removePiece()', () => {
    it('should remove a piece and return its information', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      position.placePiece(piece, 5);

      const removed = position.removePiece(5);

      expect(removed).not.toBeNull();
      expect(removed?.type).toBe('i');
      expect(removed?.color).toBe('r');
      expect(isSet(position.infantry, 5)).toBe(false);
      expect(isSet(position.redPieces, 5)).toBe(false);
      expect(isSet(position.occupied, 5)).toBe(false);
    });

    it('should remove a heroic piece', () => {
      const piece: Piece = { type: 't', color: 'b', heroic: true };
      position.placePiece(piece, 10);

      const removed = position.removePiece(10);

      expect(removed?.heroic).toBe(true);
      expect(isSet(position.heroic, 10)).toBe(false);
    });

    it('should return null when removing from empty square', () => {
      const removed = position.removePiece(5);
      expect(removed).toBeNull();
    });

    it('should update occupied count correctly', () => {
      position.placePiece({ type: 'i', color: 'r' }, 0);
      position.placePiece({ type: 't', color: 'b' }, 1);
      expect(popCount(position.occupied)).toBe(2);

      position.removePiece(0);
      expect(popCount(position.occupied)).toBe(1);

      position.removePiece(1);
      expect(popCount(position.occupied)).toBe(0);
    });
  });

  describe('getPieceAt()', () => {
    it('should return the piece at a square', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      position.placePiece(piece, 5);

      const result = position.getPieceAt(5);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('i');
      expect(result?.color).toBe('r');
    });

    it('should return null for empty square', () => {
      const result = position.getPieceAt(5);
      expect(result).toBeNull();
    });

    it('should identify heroic pieces', () => {
      position.placePiece({ type: 't', color: 'b', heroic: true }, 10);

      const result = position.getPieceAt(10);

      expect(result?.heroic).toBe(true);
    });

    it('should distinguish between colors', () => {
      position.placePiece({ type: 'i', color: 'r' }, 0);
      position.placePiece({ type: 'i', color: 'b' }, 1);

      expect(position.getPieceAt(0)?.color).toBe('r');
      expect(position.getPieceAt(1)?.color).toBe('b');
    });
  });

  describe('getColorAt()', () => {
    it('should return red for red piece', () => {
      position.placePiece({ type: 'i', color: 'r' }, 5);
      expect(position.getColorAt(5)).toBe('r');
    });

    it('should return blue for blue piece', () => {
      position.placePiece({ type: 't', color: 'b' }, 10);
      expect(position.getColorAt(10)).toBe('b');
    });

    it('should return null for empty square', () => {
      expect(position.getColorAt(5)).toBeNull();
    });
  });

  describe('isOccupied()', () => {
    it('should return true for occupied square', () => {
      position.placePiece({ type: 'i', color: 'r' }, 5);
      expect(position.isOccupied(5)).toBe(true);
    });

    it('should return false for empty square', () => {
      expect(position.isOccupied(5)).toBe(false);
    });

    it('should return false after removing piece', () => {
      position.placePiece({ type: 'i', color: 'r' }, 5);
      position.removePiece(5);
      expect(position.isOccupied(5)).toBe(false);
    });
  });

  describe('getPiecesOfType()', () => {
    it('should return bitboard of red infantry', () => {
      position.placePiece({ type: 'i', color: 'r' }, 0);
      position.placePiece({ type: 'i', color: 'r' }, 1);
      position.placePiece({ type: 'i', color: 'b' }, 2);

      const redInfantry = position.getPiecesOfType('i', 'r');

      expect(isSet(redInfantry, 0)).toBe(true);
      expect(isSet(redInfantry, 1)).toBe(true);
      expect(isSet(redInfantry, 2)).toBe(false);
      expect(popCount(redInfantry)).toBe(2);
    });

    it('should return bitboard of blue tanks', () => {
      position.placePiece({ type: 't', color: 'b' }, 5);
      position.placePiece({ type: 't', color: 'r' }, 6);

      const blueTanks = position.getPiecesOfType('t', 'b');

      expect(isSet(blueTanks, 5)).toBe(true);
      expect(isSet(blueTanks, 6)).toBe(false);
      expect(popCount(blueTanks)).toBe(1);
    });

    it('should return empty bitboard when no pieces of type', () => {
      const commanders = position.getPiecesOfType('c', 'r');
      expect(popCount(commanders)).toBe(0);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex piece placement and removal', () => {
      // Place pieces
      position.placePiece({ type: 'c', color: 'r' }, 0);
      position.placePiece({ type: 'i', color: 'r' }, 1);
      position.placePiece({ type: 't', color: 'b' }, 2);
      position.placePiece({ type: 'i', color: 'b', heroic: true }, 3);

      // Verify state
      expect(popCount(position.occupied)).toBe(4);
      expect(popCount(position.redPieces)).toBe(2);
      expect(popCount(position.bluePieces)).toBe(2);
      expect(popCount(position.heroic)).toBe(1);

      // Remove some pieces
      position.removePiece(1);
      position.removePiece(3);

      // Verify updated state
      expect(popCount(position.occupied)).toBe(2);
      expect(popCount(position.redPieces)).toBe(1);
      expect(popCount(position.bluePieces)).toBe(1);
      expect(popCount(position.heroic)).toBe(0);

      // Verify remaining pieces
      expect(position.getPieceAt(0)?.type).toBe('c');
      expect(position.getPieceAt(2)?.type).toBe('t');
      expect(position.getPieceAt(1)).toBeNull();
      expect(position.getPieceAt(3)).toBeNull();
    });
  });

  describe('Terrain Validation', () => {
    describe('canPlacePieceOnSquare', () => {
      it('should allow navy pieces on water squares', () => {
        const navyPiece: Piece = { type: 'n', color: 'r' };

        // File a (water)
        expect(position.canPlacePieceOnSquare(navyPiece, 0 * 11 + 0)).toBe(true);

        // File c (mixed - water and land)
        expect(position.canPlacePieceOnSquare(navyPiece, 0 * 11 + 2)).toBe(true);

        // River square d5
        expect(position.canPlacePieceOnSquare(navyPiece, 5 * 11 + 3)).toBe(true);
      });

      it('should not allow navy pieces on land-only squares', () => {
        const navyPiece: Piece = { type: 'n', color: 'r' };

        // File f (land only)
        expect(position.canPlacePieceOnSquare(navyPiece, 0 * 11 + 5)).toBe(false);

        // File k (land only)
        expect(position.canPlacePieceOnSquare(navyPiece, 0 * 11 + 10)).toBe(false);
      });

      it('should allow land pieces on land squares', () => {
        const infantryPiece: Piece = { type: 'i', color: 'r' };

        // File c (mixed)
        expect(position.canPlacePieceOnSquare(infantryPiece, 0 * 11 + 2)).toBe(true);

        // File f (land)
        expect(position.canPlacePieceOnSquare(infantryPiece, 0 * 11 + 5)).toBe(true);

        // River square d5 (mixed)
        expect(position.canPlacePieceOnSquare(infantryPiece, 5 * 11 + 3)).toBe(true);
      });

      it('should not allow land pieces on water-only squares', () => {
        const infantryPiece: Piece = { type: 'i', color: 'r' };

        // File a (water only)
        expect(position.canPlacePieceOnSquare(infantryPiece, 0 * 11 + 0)).toBe(false);

        // File b (water only)
        expect(position.canPlacePieceOnSquare(infantryPiece, 0 * 11 + 1)).toBe(false);
      });

      it('should validate all piece types correctly', () => {
        const landSquare = 0 * 11 + 5; // f12 (land)
        const waterSquare = 0 * 11 + 0; // a12 (water)

        // All non-navy pieces should be allowed on land
        const landPieceTypes: Array<Piece['type']> = [
          'c',
          'i',
          't',
          'm',
          'e',
          'a',
          'g',
          's',
          'f',
          'h'
        ];
        for (const type of landPieceTypes) {
          const piece: Piece = { type, color: 'r' };
          expect(position.canPlacePieceOnSquare(piece, landSquare)).toBe(true);
          expect(position.canPlacePieceOnSquare(piece, waterSquare)).toBe(false);
        }

        // Navy should only be allowed on water
        const navyPiece: Piece = { type: 'n', color: 'r' };
        expect(position.canPlacePieceOnSquare(navyPiece, waterSquare)).toBe(true);
        expect(position.canPlacePieceOnSquare(navyPiece, landSquare)).toBe(false);
      });

      it('should return false for invalid squares', () => {
        const piece: Piece = { type: 'i', color: 'r' };
        expect(position.canPlacePieceOnSquare(piece, -1)).toBe(false);
        expect(position.canPlacePieceOnSquare(piece, 132)).toBe(false);
      });
    });

    describe('isPieceOnValidTerrain', () => {
      it('should return true for empty squares', () => {
        expect(position.isPieceOnValidTerrain(0)).toBe(true);
        expect(position.isPieceOnValidTerrain(50)).toBe(true);
      });

      it('should return true for navy on water', () => {
        const navyPiece: Piece = { type: 'n', color: 'r' };
        const waterSquare = 0 * 11 + 0; // a12
        position.placePiece(navyPiece, waterSquare);
        expect(position.isPieceOnValidTerrain(waterSquare)).toBe(true);
      });

      it('should return false for navy on land-only', () => {
        const navyPiece: Piece = { type: 'n', color: 'r' };
        const landSquare = 0 * 11 + 5; // f12
        position.placePiece(navyPiece, landSquare);
        expect(position.isPieceOnValidTerrain(landSquare)).toBe(false);
      });

      it('should return true for land pieces on land', () => {
        const infantryPiece: Piece = { type: 'i', color: 'r' };
        const landSquare = 0 * 11 + 5; // f12
        position.placePiece(infantryPiece, landSquare);
        expect(position.isPieceOnValidTerrain(landSquare)).toBe(true);
      });

      it('should return false for land pieces on water-only', () => {
        const infantryPiece: Piece = { type: 'i', color: 'r' };
        const waterSquare = 0 * 11 + 0; // a12
        position.placePiece(infantryPiece, waterSquare);
        expect(position.isPieceOnValidTerrain(waterSquare)).toBe(false);
      });
    });
  });

  describe('placePieceWithValidation', () => {
    it('should place piece when terrain is valid', () => {
      const navyPiece: Piece = { type: 'n', color: 'r' };
      const waterSquare = 0 * 11 + 0; // a12 (water)

      const result = position.placePieceWithValidation(navyPiece, waterSquare);

      expect(result).toBe(true);
      expect(position.isOccupied(waterSquare)).toBe(true);
      expect(position.getPieceAt(waterSquare)?.type).toBe('n');
    });

    it('should not place piece when terrain is invalid', () => {
      const navyPiece: Piece = { type: 'n', color: 'r' };
      const landSquare = 0 * 11 + 5; // f12 (land)

      const result = position.placePieceWithValidation(navyPiece, landSquare);

      expect(result).toBe(false);
      expect(position.isOccupied(landSquare)).toBe(false);
      expect(position.getPieceAt(landSquare)).toBeNull();
    });

    it('should validate land pieces on land', () => {
      const infantryPiece: Piece = { type: 'i', color: 'r' };
      const landSquare = 0 * 11 + 5; // f12 (land)

      const result = position.placePieceWithValidation(infantryPiece, landSquare);

      expect(result).toBe(true);
      expect(position.isOccupied(landSquare)).toBe(true);
    });

    it('should reject land pieces on water-only', () => {
      const infantryPiece: Piece = { type: 'i', color: 'r' };
      const waterSquare = 0 * 11 + 0; // a12 (water only)

      const result = position.placePieceWithValidation(infantryPiece, waterSquare);

      expect(result).toBe(false);
      expect(position.isOccupied(waterSquare)).toBe(false);
    });
  });
});
