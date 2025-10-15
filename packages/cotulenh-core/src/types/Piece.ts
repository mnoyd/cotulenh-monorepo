/**
 * Piece type definitions
 */

import type { Color, PieceSymbol } from './Constants.js'

/**
 * Represents a piece on the board.
 *
 * Pieces can be simple or stacked:
 * - Simple: Just color + type
 * - Stack: Has carrying array with nested pieces
 * - Heroic: Has heroic status (only carrier can be heroic)
 */
export interface IPiece {
  readonly color: Color
  readonly type: PieceSymbol
  readonly carrying?: readonly IPiece[]
  readonly heroic?: boolean
}

/**
 * Internal mutable piece representation for game state
 */
export type Piece = {
  color: Color
  type: PieceSymbol
  carrying?: Piece[]
  heroic?: boolean
}

/**
 * Piece utility functions interface
 */
export interface IPieceUtils {
  /**
   * Create a simple piece
   */
  createPiece(color: Color, type: PieceSymbol, heroic?: boolean): Piece

  /**
   * Create a stack piece
   */
  createStack(carrier: Piece, carried: Piece | Piece[]): Piece

  /**
   * Flatten stack into array of individual pieces
   */
  flattenStack(piece: Piece): Piece[]

  /**
   * Get total count of pieces in stack (including carrier)
   */
  getStackSize(piece: Piece): number

  /**
   * Check if piece is a stack
   */
  isStack(piece: Piece): boolean

  /**
   * Deep clone a piece
   */
  clonePiece(piece: Piece): Piece

  /**
   * Check if two pieces are equal
   */
  piecesEqual(p1: Piece, p2: Piece): boolean
}
