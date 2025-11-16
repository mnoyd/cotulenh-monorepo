/**
 * Tests for terrain masks.
 */

import { describe, it, expect } from 'vitest';
import {
  WATER_MASK,
  LAND_MASK,
  isWaterSquare,
  isLandSquare,
  maskWithWater,
  maskWithLand,
  applyTerrainRestrictions
} from './terrain';
import { isSet, popCount, setBit, EMPTY } from './bitboard';

describe('Terrain Masks', () => {
  describe('WATER_MASK', () => {
    it('should include files a, b, c (files 0-2)', () => {
      // Check a few squares in files a, b, c
      for (let rank = 0; rank < 12; rank++) {
        for (let file = 0; file <= 2; file++) {
          const bit = rank * 11 + file;
          expect(isSet(WATER_MASK, bit)).toBe(true);
        }
      }
    });

    it('should include river squares d5, e5, d6, e6', () => {
      // d5 = rank 5, file 3 = bit 5*11+3 = 58
      expect(isSet(WATER_MASK, 5 * 11 + 3)).toBe(true);
      // e5 = rank 5, file 4 = bit 5*11+4 = 59
      expect(isSet(WATER_MASK, 5 * 11 + 4)).toBe(true);
      // d6 = rank 6, file 3 = bit 6*11+3 = 69
      expect(isSet(WATER_MASK, 6 * 11 + 3)).toBe(true);
      // e6 = rank 6, file 4 = bit 6*11+4 = 70
      expect(isSet(WATER_MASK, 6 * 11 + 4)).toBe(true);
    });

    it('should not include files d-k (except river squares)', () => {
      // Check files 3-10, excluding river squares
      for (let rank = 0; rank < 12; rank++) {
        for (let file = 3; file < 11; file++) {
          const bit = rank * 11 + file;
          const isRiverSquare = (file === 3 || file === 4) && (rank === 5 || rank === 6);

          if (!isRiverSquare) {
            expect(isSet(WATER_MASK, bit)).toBe(false);
          }
        }
      }
    });

    it('should have correct number of water squares', () => {
      // Files a, b, c: 3 files * 12 ranks = 36 squares
      // River squares: d5, e5, d6, e6 = 4 squares
      // Total: 40 squares
      expect(popCount(WATER_MASK)).toBe(40);
    });
  });

  describe('LAND_MASK', () => {
    it('should include files c-k (files 2-10)', () => {
      // Check all squares in files c-k
      for (let rank = 0; rank < 12; rank++) {
        for (let file = 2; file < 11; file++) {
          const bit = rank * 11 + file;
          expect(isSet(LAND_MASK, bit)).toBe(true);
        }
      }
    });

    it('should not include files a, b (files 0-1)', () => {
      // Check files a, b
      for (let rank = 0; rank < 12; rank++) {
        for (let file = 0; file < 2; file++) {
          const bit = rank * 11 + file;
          expect(isSet(LAND_MASK, bit)).toBe(false);
        }
      }
    });

    it('should have correct number of land squares', () => {
      // Files c-k: 9 files * 12 ranks = 108 squares
      expect(popCount(LAND_MASK)).toBe(108);
    });
  });

  describe('Mixed zones', () => {
    it('should have file c accessible by both navy and land', () => {
      // File c (file 2) should be in both masks
      for (let rank = 0; rank < 12; rank++) {
        const bit = rank * 11 + 2;
        expect(isSet(WATER_MASK, bit)).toBe(true);
        expect(isSet(LAND_MASK, bit)).toBe(true);
      }
    });

    it('should have river squares accessible by both navy and land', () => {
      // River squares d5, e5, d6, e6 should be in both masks
      const riverSquares = [
        5 * 11 + 3, // d5
        5 * 11 + 4, // e5
        6 * 11 + 3, // d6
        6 * 11 + 4 // e6
      ];

      for (const bit of riverSquares) {
        expect(isSet(WATER_MASK, bit)).toBe(true);
        expect(isSet(LAND_MASK, bit)).toBe(true);
      }
    });
  });
});

describe('Terrain Validation Functions', () => {
  describe('isWaterSquare', () => {
    it('should return true for water squares', () => {
      // File a (file 0)
      expect(isWaterSquare(0 * 11 + 0)).toBe(true); // a12
      expect(isWaterSquare(5 * 11 + 0)).toBe(true); // a7

      // File b (file 1)
      expect(isWaterSquare(0 * 11 + 1)).toBe(true); // b12

      // File c (file 2)
      expect(isWaterSquare(0 * 11 + 2)).toBe(true); // c12

      // River squares
      expect(isWaterSquare(5 * 11 + 3)).toBe(true); // d5
      expect(isWaterSquare(5 * 11 + 4)).toBe(true); // e5
      expect(isWaterSquare(6 * 11 + 3)).toBe(true); // d6
      expect(isWaterSquare(6 * 11 + 4)).toBe(true); // e6
    });

    it('should return false for land-only squares', () => {
      // File f (file 5)
      expect(isWaterSquare(0 * 11 + 5)).toBe(false); // f12

      // File k (file 10)
      expect(isWaterSquare(0 * 11 + 10)).toBe(false); // k12

      // d7 (not a river square)
      expect(isWaterSquare(7 * 11 + 3)).toBe(false);
    });

    it('should return false for invalid squares', () => {
      expect(isWaterSquare(-1)).toBe(false);
      expect(isWaterSquare(132)).toBe(false);
      expect(isWaterSquare(200)).toBe(false);
    });
  });

  describe('isLandSquare', () => {
    it('should return true for land squares', () => {
      // File c (file 2)
      expect(isLandSquare(0 * 11 + 2)).toBe(true); // c12

      // File d (file 3)
      expect(isLandSquare(0 * 11 + 3)).toBe(true); // d12

      // File k (file 10)
      expect(isLandSquare(0 * 11 + 10)).toBe(true); // k12

      // River squares (also land)
      expect(isLandSquare(5 * 11 + 3)).toBe(true); // d5
      expect(isLandSquare(6 * 11 + 4)).toBe(true); // e6
    });

    it('should return false for water-only squares', () => {
      // File a (file 0)
      expect(isLandSquare(0 * 11 + 0)).toBe(false); // a12

      // File b (file 1)
      expect(isLandSquare(5 * 11 + 1)).toBe(false); // b7
    });

    it('should return false for invalid squares', () => {
      expect(isLandSquare(-1)).toBe(false);
      expect(isLandSquare(132)).toBe(false);
      expect(isLandSquare(200)).toBe(false);
    });
  });
});

describe('Terrain Masking Functions', () => {
  describe('maskWithWater', () => {
    it('should mask moves to only water squares', () => {
      // Create a bitboard with moves on both water and land
      let moves = { ...EMPTY };
      moves = setBit(moves, 0 * 11 + 0); // a12 (water)
      moves = setBit(moves, 0 * 11 + 1); // b12 (water)
      moves = setBit(moves, 0 * 11 + 5); // f12 (land)
      moves = setBit(moves, 0 * 11 + 10); // k12 (land)

      const masked = maskWithWater(moves);

      // Only water squares should remain
      expect(isSet(masked, 0 * 11 + 0)).toBe(true);
      expect(isSet(masked, 0 * 11 + 1)).toBe(true);
      expect(isSet(masked, 0 * 11 + 5)).toBe(false);
      expect(isSet(masked, 0 * 11 + 10)).toBe(false);
    });
  });

  describe('maskWithLand', () => {
    it('should mask moves to only land squares', () => {
      // Create a bitboard with moves on both water and land
      let moves = { ...EMPTY };
      moves = setBit(moves, 0 * 11 + 0); // a12 (water)
      moves = setBit(moves, 0 * 11 + 1); // b12 (water)
      moves = setBit(moves, 0 * 11 + 5); // f12 (land)
      moves = setBit(moves, 0 * 11 + 10); // k12 (land)

      const masked = maskWithLand(moves);

      // Only land squares should remain
      expect(isSet(masked, 0 * 11 + 0)).toBe(false);
      expect(isSet(masked, 0 * 11 + 1)).toBe(false);
      expect(isSet(masked, 0 * 11 + 5)).toBe(true);
      expect(isSet(masked, 0 * 11 + 10)).toBe(true);
    });
  });

  describe('applyTerrainRestrictions', () => {
    it('should apply water mask for navy pieces', () => {
      let moves = { ...EMPTY };
      moves = setBit(moves, 0 * 11 + 0); // a12 (water)
      moves = setBit(moves, 0 * 11 + 5); // f12 (land)

      const restricted = applyTerrainRestrictions(moves, 'n');

      expect(isSet(restricted, 0 * 11 + 0)).toBe(true);
      expect(isSet(restricted, 0 * 11 + 5)).toBe(false);
    });

    it('should apply land mask for infantry pieces', () => {
      let moves = { ...EMPTY };
      moves = setBit(moves, 0 * 11 + 0); // a12 (water)
      moves = setBit(moves, 0 * 11 + 5); // f12 (land)

      const restricted = applyTerrainRestrictions(moves, 'i');

      expect(isSet(restricted, 0 * 11 + 0)).toBe(false);
      expect(isSet(restricted, 0 * 11 + 5)).toBe(true);
    });

    it('should apply land mask for all non-navy piece types', () => {
      let moves = { ...EMPTY };
      moves = setBit(moves, 0 * 11 + 0); // a12 (water)
      moves = setBit(moves, 0 * 11 + 5); // f12 (land)

      const landPieceTypes: Array<'c' | 'i' | 't' | 'm' | 'e' | 'a' | 'g' | 's' | 'f' | 'h'> = [
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
        const restricted = applyTerrainRestrictions(moves, type);
        expect(isSet(restricted, 0 * 11 + 0)).toBe(false);
        expect(isSet(restricted, 0 * 11 + 5)).toBe(true);
      }
    });
  });
});
