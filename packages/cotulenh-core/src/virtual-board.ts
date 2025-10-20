/**
 * Virtual Board Implementation for Deploy Sessions
 *
 * Provides an overlay system that stages changes during deploy sessions
 * without mutating the real board state until commit.
 */

import { Piece, Square, SQUARE_MAP, DeploySession } from './type.js'
import { algebraic } from './type.js'

/**
 * Virtual board that overlays virtual changes on top of the real board.
 * During deploy sessions, this provides a unified view of both real and virtual pieces.
 */
export class VirtualBoard {
  constructor(
    private realBoard: (Piece | undefined)[],
    private deploySession: DeploySession,
  ) {}

  /**
   * Get a piece from the board, checking virtual changes first.
   * @param square - Square in algebraic notation (e.g., 'e4')
   * @returns The piece at the square, or null if empty
   */
  get(square: Square): Piece | null {
    // Check virtual changes first
    if (this.deploySession.virtualChanges.has(square)) {
      return this.deploySession.virtualChanges.get(square) || null
    }

    // Fall back to real board
    const squareIndex = SQUARE_MAP[square]
    if (squareIndex === undefined) {
      return null
    }

    return this.realBoard[squareIndex] || null
  }

  /**
   * Set a piece on the virtual board (stages change without mutating real board).
   * @param square - Square in algebraic notation
   * @param piece - Piece to place, or null to remove
   */
  set(square: Square, piece: Piece | null): void {
    // Always update virtual state during deploy
    this.deploySession.virtualChanges.set(square, piece)
  }

  /**
   * Generator that yields all pieces on the effective board.
   * Combines virtual and real pieces without duplication.
   * @param color - Optional color filter
   */
  *pieces(color?: 'r' | 'b'): Generator<[Square, Piece], void, unknown> {
    const processedSquares = new Set<Square>()

    // Virtual pieces first (they override real pieces)
    for (const [square, piece] of this.deploySession.virtualChanges) {
      processedSquares.add(square)
      if (piece && (!color || piece.color === color)) {
        yield [square, piece]
      }
    }

    // Real pieces for squares not in virtual changes
    for (let i = 0; i < this.realBoard.length; i++) {
      const piece = this.realBoard[i]
      if (!piece) continue

      const square = algebraic(i)
      if (processedSquares.has(square)) continue

      if (!color || piece.color === color) {
        yield [square, piece]
      }
    }
  }

  /**
   * Check if a square has a piece (virtual or real).
   * @param square - Square to check
   * @returns True if square has a piece
   */
  has(square: Square): boolean {
    return this.get(square) !== null
  }

  /**
   * Get all squares that have been virtually modified.
   * @returns Array of squares with virtual changes
   */
  getVirtualChanges(): Array<[Square, Piece | null]> {
    return Array.from(this.deploySession.virtualChanges.entries())
  }

  /**
   * Check if a square has been virtually modified.
   * @param square - Square to check
   * @returns True if square has virtual changes
   */
  hasVirtualChange(square: Square): boolean {
    return this.deploySession.virtualChanges.has(square)
  }
}
