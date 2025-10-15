/**
 * Square utilities for 16x16 mailbox representation
 *
 * Square encoding: square = rank * 16 + file
 * - Files: 0-10 (a-k)
 * - Ranks: 0-11 (12 down to 1)
 *
 * Examples:
 * - a12 (top-left) = 0*16 + 0 = 0x00
 * - k12 (top-right) = 0*16 + 10 = 0x0A
 * - a1 (bottom-left) = 11*16 + 0 = 0xB0
 * - k1 (bottom-right) = 11*16 + 10 = 0xBA
 * - e5 (center-ish) = 7*16 + 4 = 0x74
 */

import { BOARD_FILES, BOARD_RANKS, BOARD_STRIDE } from '../types/Constants.js'

/**
 * Extract file (0-10) from square index
 */
export function getFile(square: number): number {
  return square & 0x0f
}

/**
 * Extract rank (0-11) from square index
 */
export function getRank(square: number): number {
  return square >> 4
}

/**
 * Check if square index is valid
 */
export function isValidSquare(square: number): boolean {
  const file = getFile(square)
  const rank = getRank(square)
  return file < BOARD_FILES && rank < BOARD_RANKS
}

/**
 * Convert file and rank to square index
 */
export function fileRankToSquare(file: number, rank: number): number {
  return (rank << 4) | file
}

/**
 * Convert algebraic notation to square index
 * @example 'e5' → 0x74, 'a12' → 0x00, 'k1' → 0xBA
 */
export function algebraicToSquare(notation: string): number {
  if (notation.length < 2 || notation.length > 3) {
    throw new Error(`Invalid algebraic notation: ${notation}`)
  }

  const fileChar = notation.charCodeAt(0)
  const file = fileChar - 'a'.charCodeAt(0) // a=0, b=1, ..., k=10

  const rankStr = notation.substring(1)
  const displayRank = parseInt(rankStr, 10) // 1-12
  const rank = 12 - displayRank // Convert to 0-11 (12→0, 11→1, ..., 1→11)

  if (file < 0 || file >= BOARD_FILES) {
    throw new Error(`Invalid file in notation: ${notation}`)
  }

  if (rank < 0 || rank >= BOARD_RANKS) {
    throw new Error(`Invalid rank in notation: ${notation}`)
  }

  return fileRankToSquare(file, rank)
}

/**
 * Convert square index to algebraic notation
 * @example 0x74 → 'e5', 0x00 → 'a12', 0xBA → 'k1'
 */
export function squareToAlgebraic(square: number): string {
  if (!isValidSquare(square)) {
    throw new Error(`Invalid square index: ${square}`)
  }

  const file = getFile(square)
  const rank = getRank(square)

  const fileChar = String.fromCharCode('a'.charCodeAt(0) + file)
  const rankNum = 12 - rank // Convert 0-11 to 12-1

  return `${fileChar}${rankNum}`
}

/**
 * Get file letter ('a'-'k') from square
 */
export function getFileLetter(square: number): string {
  const file = getFile(square)
  return String.fromCharCode('a'.charCodeAt(0) + file)
}

/**
 * Get rank number (1-12) from square
 */
export function getRankNumber(square: number): number {
  const rank = getRank(square)
  return 12 - rank
}

/**
 * Calculate distance between two squares (Chebyshev distance)
 */
export function distance(sq1: number, sq2: number): number {
  const file1 = getFile(sq1)
  const rank1 = getRank(sq1)
  const file2 = getFile(sq2)
  const rank2 = getRank(sq2)

  const fileDistance = Math.abs(file1 - file2)
  const rankDistance = Math.abs(rank1 - rank2)

  return Math.max(fileDistance, rankDistance)
}

/**
 * Calculate Manhattan distance between two squares
 */
export function manhattanDistance(sq1: number, sq2: number): number {
  const file1 = getFile(sq1)
  const rank1 = getRank(sq1)
  const file2 = getFile(sq2)
  const rank2 = getRank(sq2)

  return Math.abs(file1 - file2) + Math.abs(rank1 - rank2)
}

/**
 * Check if two squares are on the same file
 */
export function sameFile(sq1: number, sq2: number): boolean {
  return getFile(sq1) === getFile(sq2)
}

/**
 * Check if two squares are on the same rank
 */
export function sameRank(sq1: number, sq2: number): boolean {
  return getRank(sq1) === getRank(sq2)
}

/**
 * Check if two squares are on the same diagonal
 */
export function sameDiagonal(sq1: number, sq2: number): boolean {
  const file1 = getFile(sq1)
  const rank1 = getRank(sq1)
  const file2 = getFile(sq2)
  const rank2 = getRank(sq2)

  return Math.abs(file1 - file2) === Math.abs(rank1 - rank2)
}

/**
 * Get all squares on the board
 */
export function* allSquares(): Generator<number> {
  for (let rank = 0; rank < BOARD_RANKS; rank++) {
    for (let file = 0; file < BOARD_FILES; file++) {
      yield fileRankToSquare(file, rank)
    }
  }
}

/**
 * Create a square map for reverse lookup
 * Maps algebraic notation to square index
 */
export function createSquareMap(): Map<string, number> {
  const map = new Map<string, number>()

  for (const square of allSquares()) {
    const notation = squareToAlgebraic(square)
    map.set(notation, square)
  }

  return map
}

// Pre-computed square map (for performance)
export const SQUARE_MAP = createSquareMap()
