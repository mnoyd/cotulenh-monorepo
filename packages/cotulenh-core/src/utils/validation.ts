/**
 * Validation utilities
 */

import type { Color, PieceSymbol } from '../types/Constants.js'
import { PIECE_TYPES, RED, BLUE } from '../types/Constants.js'
import type { Piece } from '../types/Piece.js'
import { isValidSquare } from './square.js'

/**
 * Validate color
 */
export function isValidColor(color: unknown): color is Color {
  return color === RED || color === BLUE
}

/**
 * Validate piece type
 */
export function isValidPieceType(type: unknown): type is PieceSymbol {
  return typeof type === 'string' && PIECE_TYPES.includes(type as PieceSymbol)
}

/**
 * Validate piece structure
 */
export function isValidPiece(piece: unknown): piece is Piece {
  if (typeof piece !== 'object' || piece === null) {
    return false
  }

  const p = piece as Record<string, unknown>

  // Check required fields
  if (!isValidColor(p.color) || !isValidPieceType(p.type)) {
    return false
  }

  // Check optional heroic field
  if (p.heroic !== undefined && typeof p.heroic !== 'boolean') {
    return false
  }

  // Check optional carrying array
  if (p.carrying !== undefined) {
    if (!Array.isArray(p.carrying)) {
      return false
    }

    // Recursively validate carried pieces
    for (const carried of p.carrying) {
      if (!isValidPiece(carried)) {
        return false
      }
    }
  }

  return true
}

/**
 * Validate square index
 */
export function validateSquare(square: number): void {
  if (!Number.isInteger(square)) {
    throw new Error(`Square must be an integer, got: ${square}`)
  }

  if (!isValidSquare(square)) {
    throw new Error(`Invalid square index: ${square}`)
  }
}

/**
 * Validate piece
 */
export function validatePiece(piece: unknown): asserts piece is Piece {
  if (!isValidPiece(piece)) {
    throw new Error(`Invalid piece: ${JSON.stringify(piece)}`)
  }
}

/**
 * Validate color
 */
export function validateColor(color: unknown): asserts color is Color {
  if (!isValidColor(color)) {
    throw new Error(`Invalid color: ${color}`)
  }
}

/**
 * Swap color
 */
export function swapColor(color: Color): Color {
  return color === RED ? BLUE : RED
}

/**
 * Validate move number
 */
export function validateMoveNumber(moveNumber: number): void {
  if (!Number.isInteger(moveNumber) || moveNumber < 1) {
    throw new Error(`Invalid move number: ${moveNumber}`)
  }
}

/**
 * Validate half moves
 */
export function validateHalfMoves(halfMoves: number): void {
  if (!Number.isInteger(halfMoves) || halfMoves < 0) {
    throw new Error(`Invalid half moves: ${halfMoves}`)
  }
}
