/**
 * Board type definitions
 */

import type { Color } from './Constants.js'
import type { Piece } from './Piece.js'

/**
 * Board interface for the 16x16 mailbox representation
 * Valid squares: 11 files × 12 ranks = 132 squares
 */
export interface IBoard {
  /**
   * Get piece at square
   * @param square - Square index (0-255)
   * @returns Piece or null if square is empty
   */
  get(square: number): Piece | null

  /**
   * Set piece at square
   * @param square - Square index (0-255)
   * @param piece - Piece to place, or null to clear
   */
  set(square: number, piece: Piece | null): void

  /**
   * Iterate over pieces efficiently (O(pieces) not O(squares))
   * @param color - Optional color filter
   * @yields [square, piece] tuples
   */
  pieces(color?: Color): Generator<[number, Piece]>

  /**
   * Get all occupied squares for a color
   * @param color - Color to filter
   * @returns Set of square indices
   */
  getOccupiedSquares(color: Color): ReadonlySet<number>

  /**
   * Check if square is valid
   * @param square - Square index
   * @returns true if square is within valid 11x12 board
   */
  isValid(square: number): boolean

  /**
   * Clone board (deep copy)
   * @returns New board instance with copied state
   */
  clone(): IBoard

  /**
   * Clear all pieces from board
   */
  clear(): void

  /**
   * Count total pieces on board
   */
  countPieces(color?: Color): number
}

/**
 * Board factory interface
 */
export interface IBoardFactory {
  /**
   * Create empty board
   */
  createEmpty(): IBoard

  /**
   * Create board from starting position
   */
  createInitial(): IBoard

  /**
   * Create board from square array
   */
  fromArray(squares: (Piece | null)[]): IBoard
}
