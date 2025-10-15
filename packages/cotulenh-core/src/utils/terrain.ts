/**
 * Terrain utilities for CoTuLenh
 *
 * Terrain zones:
 * - Pure water (a-b files): Navy only
 * - Mixed zone (c file + river squares): Both navy and land
 * - Pure land (d-k files, except river): Land pieces only
 *
 * River squares: d6, e6, d7, e7
 * Bridge squares: f6, f7, h6, h7
 */

import { NAVY, HEAVY_PIECES, type PieceSymbol } from '../types/Constants.js'
import { getFile, getRank, isValidSquare } from './square.js'

// Terrain masks (1 = accessible, 0 = not accessible)
const navyMask = new Uint8Array(256)
const landMask = new Uint8Array(256)

/**
 * Initialize terrain masks
 */
function initTerrainMasks(): void {
  for (let sq = 0; sq < 256; sq++) {
    if (!isValidSquare(sq)) {
      continue
    }

    const file = getFile(sq)
    const rank = getRank(sq)

    // Navy operational areas:
    // - Files a-c (0-2)
    // - River squares: d6, e6, d7, e7 (files 3-4, ranks 5-6)
    const isNavySquare =
      file <= 2 || ((file === 3 || file === 4) && (rank === 5 || rank === 6))

    navyMask[sq] = isNavySquare ? 1 : 0

    // Land pieces operational areas:
    // - Files c-k (2-10)
    // - Includes mixed zone (c file) and all land squares
    const isLandSquare = file >= 2

    landMask[sq] = isLandSquare ? 1 : 0
  }
}

// Initialize on module load
initTerrainMasks()

/**
 * Check if square is navigable by navy
 */
export function isNavySquare(square: number): boolean {
  return navyMask[square] === 1
}

/**
 * Check if square is accessible by land pieces
 */
export function isLandSquare(square: number): boolean {
  return landMask[square] === 1
}

/**
 * Check if piece can be placed on square (terrain validation)
 */
export function canPlaceOnSquare(
  pieceType: PieceSymbol,
  square: number,
): boolean {
  if (!isValidSquare(square)) {
    return false
  }

  if (pieceType === NAVY) {
    return isNavySquare(square)
  } else {
    return isLandSquare(square)
  }
}

/**
 * Heavy piece river crossing validation
 *
 * Heavy pieces (Artillery, Anti-Air, Missile) cannot cross the river.
 * River divides board into:
 * - Zone 1: Files c-k, ranks 7-12 (upper half)
 * - Zone 2: Files c-k, ranks 1-6 (lower half)
 * - Water area (files a-b): No restrictions
 */
export function canHeavyPieceCrossRiver(
  pieceType: PieceSymbol,
  from: number,
  to: number,
): boolean {
  // Only applies to heavy pieces
  if (!HEAVY_PIECES.has(pieceType)) {
    return true
  }

  const fromFile = getFile(from)
  const toFile = getFile(to)
  const fromRank = getRank(from)
  const toRank = getRank(to)

  // Water area (files a-b): No restrictions
  if (fromFile <= 1 || toFile <= 1) {
    return true
  }

  // Check if crossing the river (rank 6/7 boundary in files c-k)
  // Rank 6 = index 5, Rank 7 = index 6
  // Upper zone: ranks 0-5 (12-7), Lower zone: ranks 6-11 (6-1)

  const fromZone = fromRank <= 5 ? 'upper' : 'lower'
  const toZone = toRank <= 5 ? 'upper' : 'lower'

  // Cannot cross between zones
  return fromZone === toZone
}

/**
 * Get terrain zone for a square
 */
export function getTerrainZone(square: number): 'water' | 'mixed' | 'land' {
  const file = getFile(square)
  const rank = getRank(square)

  if (file <= 1) {
    return 'water'
  }

  if (file === 2) {
    return 'mixed'
  }

  // River squares are also mixed
  if ((file === 3 || file === 4) && (rank === 5 || rank === 6)) {
    return 'mixed'
  }

  return 'land'
}

/**
 * Check if square is a river square
 */
export function isRiverSquare(square: number): boolean {
  const file = getFile(square)
  const rank = getRank(square)

  return (file === 3 || file === 4) && (rank === 5 || rank === 6)
}

/**
 * Check if square is a bridge square
 */
export function isBridgeSquare(square: number): boolean {
  const file = getFile(square)
  const rank = getRank(square)

  return (file === 5 || file === 7) && (rank === 5 || rank === 6)
}

/**
 * Get terrain masks for external use (readonly)
 */
export function getNavyMask(): Readonly<Uint8Array> {
  return navyMask
}

export function getLandMask(): Readonly<Uint8Array> {
  return landMask
}
