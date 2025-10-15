/**
 * Piece implementation and utilities
 */

import type { Color, PieceSymbol } from '../types/Constants.js'
import type { Piece, IPieceUtils } from '../types/Piece.js'

/**
 * Piece utility functions
 */
export class PieceUtils implements IPieceUtils {
  /**
   * Create a simple piece
   */
  createPiece(color: Color, type: PieceSymbol, heroic?: boolean): Piece {
    const piece: Piece = { color, type }
    if (heroic) {
      piece.heroic = true
    }
    return piece
  }

  /**
   * Create a stack piece
   */
  createStack(carrier: Piece, carried: Piece | Piece[]): Piece {
    const carriedArray = Array.isArray(carried) ? carried : [carried]

    return {
      color: carrier.color,
      type: carrier.type,
      heroic: carrier.heroic,
      carrying: carriedArray,
    }
  }

  /**
   * Flatten stack into array of individual pieces
   * Recursively flattens nested stacks
   */
  flattenStack(piece: Piece): Piece[] {
    const result: Piece[] = [
      {
        color: piece.color,
        type: piece.type,
        heroic: piece.heroic,
      },
    ]

    if (piece.carrying && piece.carrying.length > 0) {
      for (const carried of piece.carrying) {
        result.push(...this.flattenStack(carried))
      }
    }

    return result
  }

  /**
   * Get total count of pieces in stack (including carrier)
   */
  getStackSize(piece: Piece): number {
    if (!piece.carrying || piece.carrying.length === 0) {
      return 1
    }

    let size = 1 // The carrier itself
    for (const carried of piece.carrying) {
      size += this.getStackSize(carried)
    }
    return size
  }

  /**
   * Check if piece is a stack
   */
  isStack(piece: Piece): boolean {
    return Boolean(piece.carrying && piece.carrying.length > 0)
  }

  /**
   * Deep clone a piece
   */
  clonePiece(piece: Piece): Piece {
    const cloned: Piece = {
      color: piece.color,
      type: piece.type,
    }

    if (piece.heroic) {
      cloned.heroic = true
    }

    if (piece.carrying && piece.carrying.length > 0) {
      cloned.carrying = piece.carrying.map((p) => this.clonePiece(p))
    }

    return cloned
  }

  /**
   * Check if two pieces are equal (deep comparison)
   */
  piecesEqual(p1: Piece, p2: Piece): boolean {
    if (p1.color !== p2.color || p1.type !== p2.type) {
      return false
    }

    if (Boolean(p1.heroic) !== Boolean(p2.heroic)) {
      return false
    }

    // Check carrying arrays
    const c1 = p1.carrying || []
    const c2 = p2.carrying || []

    if (c1.length !== c2.length) {
      return false
    }

    for (let i = 0; i < c1.length; i++) {
      if (!this.piecesEqual(c1[i], c2[i])) {
        return false
      }
    }

    return true
  }
}

/**
 * Singleton instance of piece utilities
 */
export const pieceUtils = new PieceUtils()
