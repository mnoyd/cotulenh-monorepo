/**
 * Terrain masks for CoTuLenh bitboard implementation.
 *
 * The CoTuLenh board has two types of terrain:
 * - Water squares: accessible by navy pieces (files a-c + specific river squares)
 * - Land squares: accessible by land pieces (files c-k)
 *
 * Note: File c is a mixed zone accessible by both navy and land pieces.
 */

import type { Bitboard } from './bitboard';
import { EMPTY, setBit, isSet, and } from './bitboard';
import type { PieceSymbol } from './types';

/**
 * Bitboard mask for water squares (navy-accessible).
 *
 * Navy pieces can move on:
 * - Files a, b, c (files 0-2)
 * - Specific river squares: d5, e5, d6, e6 (files 3-4, ranks 5-6)
 */
export const WATER_MASK: Bitboard = createWaterMask();

/**
 * Bitboard mask for land squares (land piece-accessible).
 *
 * Land pieces can move on:
 * - Files c-k (files 2-10)
 */
export const LAND_MASK: Bitboard = createLandMask();

/**
 * Creates the water mask bitboard.
 *
 * @returns Bitboard with water squares set
 */
function createWaterMask(): Bitboard {
  let mask: Bitboard = { ...EMPTY };

  // Iterate through all squares on the 11x12 board
  for (let rank = 0; rank < 12; rank++) {
    for (let file = 0; file < 11; file++) {
      // Calculate linear bit index (rank * 11 + file)
      const bit = rank * 11 + file;

      // Navy operational areas:
      // - Files a, b, c (files 0-2)
      // - Specific river squares: d5, e5, d6, e6 (files 3-4, ranks 5-6)
      const isWater = file <= 2 || ((file === 3 || file === 4) && (rank === 5 || rank === 6));

      if (isWater) {
        mask = setBit(mask, bit);
      }
    }
  }

  return mask;
}

/**
 * Creates the land mask bitboard.
 *
 * @returns Bitboard with land squares set
 */
function createLandMask(): Bitboard {
  let mask: Bitboard = { ...EMPTY };

  // Iterate through all squares on the 11x12 board
  for (let rank = 0; rank < 12; rank++) {
    for (let file = 0; file < 11; file++) {
      // Calculate linear bit index (rank * 11 + file)
      const bit = rank * 11 + file;

      // Land pieces operational areas:
      // - Files c-k (files 2-10)
      const isLand = file >= 2;

      if (isLand) {
        mask = setBit(mask, bit);
      }
    }
  }

  return mask;
}

/**
 * Checks if a square is a water square (accessible by navy).
 *
 * @param square - Square index (0-131) to check
 * @returns True if the square is water, false otherwise
 */
export function isWaterSquare(square: number): boolean {
  if (square < 0 || square >= 132) {
    return false;
  }
  return isSet(WATER_MASK, square);
}

/**
 * Checks if a square is a land square (accessible by land pieces).
 *
 * @param square - Square index (0-131) to check
 * @returns True if the square is land, false otherwise
 */
export function isLandSquare(square: number): boolean {
  if (square < 0 || square >= 132) {
    return false;
  }
  return isSet(LAND_MASK, square);
}

/**
 * Masks a bitboard with the water mask.
 * Used to restrict navy piece moves to water squares.
 *
 * @param moves - Bitboard of potential move destinations
 * @returns Bitboard with only water squares set
 */
export function maskWithWater(moves: Bitboard): Bitboard {
  return and(moves, WATER_MASK);
}

/**
 * Masks a bitboard with the land mask.
 * Used to restrict land piece moves to land squares.
 *
 * @param moves - Bitboard of potential move destinations
 * @returns Bitboard with only land squares set
 */
export function maskWithLand(moves: Bitboard): Bitboard {
  return and(moves, LAND_MASK);
}

/**
 * Applies terrain restrictions to a move bitboard based on piece type.
 *
 * Navy pieces are restricted to water squares.
 * All other pieces are restricted to land squares.
 *
 * @param moves - Bitboard of potential move destinations
 * @param pieceType - Type of piece making the move
 * @returns Bitboard with terrain restrictions applied
 */
export function applyTerrainRestrictions(moves: Bitboard, pieceType: PieceSymbol): Bitboard {
  if (pieceType === 'n') {
    // Navy pieces can only move on water
    return maskWithWater(moves);
  } else {
    // All other pieces can only move on land
    return maskWithLand(moves);
  }
}
