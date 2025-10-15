/**
 * Board implementation using 16x16 mailbox representation
 *
 * Valid squares: 11 files × 12 ranks = 132 squares
 * Array size: 16 × 16 = 256 elements
 *
 * Square encoding: square = rank * 16 + file
 * - a12 = 0x00, k12 = 0x0A
 * - a11 = 0x10, k11 = 0x1A
 * - ...
 * - a1 = 0xB0, k1 = 0xBA
 */

import type { Color } from '../types/Constants.js'
import { BOARD_SIZE, BOARD_FILES, BOARD_RANKS } from '../types/Constants.js'
import type { Piece } from '../types/Piece.js'
import type { IBoard } from '../types/Board.js'
import { pieceUtils } from './Piece.js'

export class Board implements IBoard {
  // 16x16 array for mailbox representation
  private squares: (Piece | null)[]

  // Piece lists for fast iteration (O(pieces) not O(squares))
  private redPieces: Set<number>
  private bluePieces: Set<number>

  constructor() {
    this.squares = new Array(BOARD_SIZE).fill(null)
    this.redPieces = new Set()
    this.bluePieces = new Set()
  }

  /**
   * Get piece at square
   */
  get(square: number): Piece | null {
    return this.squares[square] || null
  }

  /**
   * Set piece at square
   * Automatically updates piece lists
   */
  set(square: number, piece: Piece | null): void {
    // Remove from old lists
    this.redPieces.delete(square)
    this.bluePieces.delete(square)

    // Set piece
    this.squares[square] = piece

    // Add to new list
    if (piece !== null) {
      if (piece.color === 'r') {
        this.redPieces.add(square)
      } else {
        this.bluePieces.add(square)
      }
    }
  }

  /**
   * Iterate over pieces efficiently
   * Uses piece lists (O(pieces) not O(squares))
   */
  *pieces(color?: Color): Generator<[number, Piece]> {
    const squares =
      color === 'r'
        ? this.redPieces
        : color === 'b'
          ? this.bluePieces
          : new Set([...this.redPieces, ...this.bluePieces])

    for (const square of squares) {
      const piece = this.squares[square]
      if (piece !== null) {
        yield [square, piece]
      }
    }
  }

  /**
   * Get all occupied squares for a color
   */
  getOccupiedSquares(color: Color): ReadonlySet<number> {
    return color === 'r' ? this.redPieces : this.bluePieces
  }

  /**
   * Check if square is valid
   * Valid: files 0-10, ranks 0-11
   */
  isValid(square: number): boolean {
    const file = square & 0x0f // Last 4 bits
    const rank = square >> 4 // First 4 bits (upper 4 bits)
    return file < BOARD_FILES && rank < BOARD_RANKS
  }

  /**
   * Clone board (deep copy)
   */
  clone(): Board {
    const cloned = new Board()

    // Deep copy squares array (clone pieces)
    cloned.squares = this.squares.map((piece) =>
      piece ? pieceUtils.clonePiece(piece) : null,
    )

    // Copy piece lists
    cloned.redPieces = new Set(this.redPieces)
    cloned.bluePieces = new Set(this.bluePieces)

    return cloned
  }

  /**
   * Clear all pieces from board
   */
  clear(): void {
    this.squares.fill(null)
    this.redPieces.clear()
    this.bluePieces.clear()
  }

  /**
   * Count total pieces on board
   */
  countPieces(color?: Color): number {
    if (color === 'r') {
      return this.redPieces.size
    } else if (color === 'b') {
      return this.bluePieces.size
    } else {
      return this.redPieces.size + this.bluePieces.size
    }
  }

  /**
   * Create empty board
   */
  static createEmpty(): Board {
    return new Board()
  }

  /**
   * Create board from square array
   * Useful for testing and FEN parsing
   */
  static fromArray(squares: (Piece | null)[]): Board {
    if (squares.length !== BOARD_SIZE) {
      throw new Error(
        `Invalid squares array length: expected ${BOARD_SIZE}, got ${squares.length}`,
      )
    }

    const board = new Board()

    for (let sq = 0; sq < BOARD_SIZE; sq++) {
      if (squares[sq] !== null) {
        board.set(sq, squares[sq])
      }
    }

    return board
  }
}
