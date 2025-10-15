/**
 * Deploy session implementation
 *
 * Represents the virtual state during deploy phase where a stack is being split.
 * Uses virtual overlay pattern - changes are tracked but not applied until complete.
 */

import type { Color } from '../types/Constants.js'
import type { Piece } from '../types/Piece.js'
import type { IBoard } from '../types/Board.js'
import type { IDeploySession } from '../types/GameState.js'
import { pieceUtils } from './Piece.js'

export class DeploySession implements IDeploySession {
  readonly originalSquare: number
  readonly turn: Color
  readonly originalPiece: Piece
  readonly movedPieces: readonly Piece[]
  readonly stay?: readonly Piece[]

  // Virtual changes map: square -> piece (or null if cleared)
  private virtualChanges: Map<number, Piece | null>

  constructor(
    originalSquare: number,
    turn: Color,
    originalPiece: Piece,
    movedPieces: Piece[] = [],
    stay?: Piece[],
  ) {
    this.originalSquare = originalSquare
    this.turn = turn
    this.originalPiece = pieceUtils.clonePiece(originalPiece)
    this.movedPieces = movedPieces.map((p) => pieceUtils.clonePiece(p))
    this.stay = stay?.map((p) => pieceUtils.clonePiece(p))
    this.virtualChanges = new Map()
  }

  /**
   * Get the effective piece at a square (considering virtual changes)
   */
  getEffectivePiece(board: IBoard, square: number): Piece | null {
    // Check if there's a virtual change for this square
    if (this.virtualChanges.has(square)) {
      return this.virtualChanges.get(square) || null
    }

    // Otherwise return the actual board state
    return board.get(square)
  }

  /**
   * Get remaining pieces that still need to be deployed
   */
  getRemainingPieces(): readonly Piece[] {
    const allPieces = pieceUtils.flattenStack(this.originalPiece)
    const deployedCount = this.movedPieces.length + (this.stay?.length || 0)

    return allPieces.slice(deployedCount)
  }

  /**
   * Check if deploy session is complete
   * Complete when all pieces have been accounted for (moved or stayed)
   */
  isComplete(): boolean {
    const totalPieces = pieceUtils.getStackSize(this.originalPiece)
    const accountedFor = this.movedPieces.length + (this.stay?.length || 0)

    return accountedFor >= totalPieces
  }

  /**
   * Add virtual change (for tracking during deploy)
   */
  addVirtualChange(square: number, piece: Piece | null): void {
    this.virtualChanges.set(square, piece)
  }

  /**
   * Clone deploy session
   */
  clone(): DeploySession {
    const cloned = new DeploySession(
      this.originalSquare,
      this.turn,
      this.originalPiece,
      [...this.movedPieces],
      this.stay ? [...this.stay] : undefined,
    )

    // Clone virtual changes
    cloned.virtualChanges = new Map(this.virtualChanges)

    return cloned
  }

  /**
   * Create a new deploy session with an additional moved piece
   */
  withMovedPiece(piece: Piece): DeploySession {
    return new DeploySession(
      this.originalSquare,
      this.turn,
      this.originalPiece,
      [...this.movedPieces, piece],
      this.stay ? [...this.stay] : undefined,
    )
  }

  /**
   * Create a new deploy session with stay pieces
   */
  withStayPieces(stay: Piece[]): DeploySession {
    return new DeploySession(
      this.originalSquare,
      this.turn,
      this.originalPiece,
      [...this.movedPieces],
      stay,
    )
  }

  /**
   * Create initial deploy session from a stack
   */
  static create(square: number, piece: Piece, turn: Color): DeploySession {
    if (!pieceUtils.isStack(piece)) {
      throw new Error('Cannot create deploy session from non-stack piece')
    }

    return new DeploySession(square, turn, piece)
  }
}
