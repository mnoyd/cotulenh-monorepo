// src/deploy-session.ts

import {
  Color,
  Piece,
  InternalMove,
  BITS,
  DeployState,
  algebraic,
  CAPTURE_MASK,
} from './type.js'
import { flattenPiece, createCombineStackFromPieces } from './utils.js'

/**
 * DeploySession tracks the state of an active deployment sequence.
 *
 * Instead of storing just which pieces moved (like the old DeployState),
 * this stores the complete move history with destinations, captures, etc.
 *
 * Benefits:
 * - Complete move history for SAN generation
 * - Support for recombine moves
 * - Better undo/redo
 * - Extended FEN serialization
 */
export class DeploySession {
  stackSquare: number
  turn: Color
  originalPiece: Piece
  actions: InternalMove[] = []
  startFEN: string
  stayPieces?: Piece[] // Pieces explicitly marked to stay

  constructor(data: {
    stackSquare: number
    turn: Color
    originalPiece: Piece
    startFEN: string
    actions?: InternalMove[]
    stayPieces?: Piece[]
  }) {
    this.stackSquare = data.stackSquare
    this.turn = data.turn
    this.originalPiece = data.originalPiece
    this.startFEN = data.startFEN
    this.actions = data.actions || []
    this.stayPieces = data.stayPieces
  }

  /**
   * Calculate remaining pieces by subtracting moved pieces from original.
   * This is the core method that replaces the old movedPieces array.
   *
   * @returns The piece (potentially a stack) remaining at the stack square,
   *          or null if all pieces have been deployed
   */
  getRemainingPieces(): Piece | null {
    // Flatten original to get all pieces
    const originalFlat = flattenPiece(this.originalPiece)

    // Collect all moved pieces
    const movedTypes: string[] = []
    for (const move of this.actions) {
      // Only count moves FROM the stack square with DEPLOY flag
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        const movedPieces = flattenPiece(move.piece)
        movedTypes.push(...movedPieces.map((p) => p.type))
      }
    }

    // Calculate remaining by removing moved pieces
    const remainingPieces: Piece[] = []
    const movedTypesCopy = [...movedTypes]

    for (const piece of originalFlat) {
      const index = movedTypesCopy.indexOf(piece.type)
      if (index === -1) {
        // Not moved, keep it
        remainingPieces.push(piece)
      } else {
        // Was moved, remove from tracking
        movedTypesCopy.splice(index, 1)
      }
    }

    if (remainingPieces.length === 0) return null

    // Reconstruct stack from remaining pieces
    const { combined } = createCombineStackFromPieces(remainingPieces)
    return combined || null
  }

  /**
   * Get all squares where pieces from this stack were deployed.
   * Used for generating recombine moves.
   *
   * @returns Array of square indices where pieces were deployed
   */
  getDeployedSquares(): number[] {
    const squares = new Set<number>()

    for (const move of this.actions) {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        squares.add(move.to)
      }
    }

    return Array.from(squares)
  }

  /**
   * Add a move to the session.
   * Called when a deploy move is executed.
   *
   * @param move The move to add to the action history
   */
  addMove(move: InternalMove): void {
    this.actions.push(move)
  }

  /**
   * Remove and return the last move from the session.
   * Used for undo during deployment.
   *
   * @returns The removed move, or null if no moves to undo
   */
  undoLastMove(): InternalMove | null {
    return this.actions.pop() || null
  }

  /**
   * Check if the session can be committed.
   * A session can be committed if:
   * - At least one move has been made, AND
   * - Either all pieces are deployed OR staying pieces are specified
   *
   * @returns true if the session can be committed
   */
  canCommit(): boolean {
    // Must have made at least one move
    if (this.actions.length === 0) return false

    const remaining = this.getRemainingPieces()

    // If no pieces remain, can commit
    if (!remaining) return true

    // If staying pieces specified, can commit
    if (this.stayPieces?.length) return true

    // Otherwise, cannot commit (pieces remain without being marked as staying)
    return false
  }

  /**
   * Check if the session is complete (all pieces accounted for).
   * A session is complete when:
   * moved pieces + staying pieces = original pieces
   *
   * @returns true if all pieces are accounted for
   */
  isComplete(): boolean {
    const remaining = this.getRemainingPieces()
    const originalFlat = flattenPiece(this.originalPiece)

    // Count moved pieces
    const movedCount = this.actions.reduce((sum, move) => {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        return sum + flattenPiece(move.piece).length
      }
      return sum
    }, 0)

    const stayCount = this.stayPieces?.length || 0

    return movedCount + stayCount === originalFlat.length
  }

  /**
   * Cancel the session and return moves to undo in reverse order.
   * Used when user wants to abort the deployment.
   *
   * @returns Array of moves to undo (in reverse order)
   */
  cancel(): InternalMove[] {
    return [...this.actions].reverse()
  }

  /**
   * Convert to legacy DeployState format for backward compatibility.
   * Note: This is a lossy conversion - destination information is lost.
   *
   * @returns DeployState object compatible with old code
   * @deprecated Use DeploySession directly instead
   */
  toLegacyDeployState(): DeployState {
    const movedPieces: Piece[] = []

    for (const move of this.actions) {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        movedPieces.push(...flattenPiece(move.piece))
      }
    }

    return {
      stackSquare: this.stackSquare,
      turn: this.turn,
      originalPiece: this.originalPiece,
      movedPieces,
      stay: this.stayPieces,
    }
  }

  /**
   * Generate extended FEN format with DEPLOY marker.
   * Format: "base-fen DEPLOY c3:Nc5,Fd4..."
   *
   * This allows saving/loading games mid-deployment.
   *
   * @param baseFEN The FEN before deployment started
   * @returns Extended FEN string with deploy session info
   */
  toExtendedFEN(baseFEN: string): string {
    if (this.actions.length === 0) {
      // No moves yet, just indicate deploy started
      return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:`
    }

    // Generate SAN notation for the moves
    // Format: Nc5,Fd4,Te5 (piece type + destination)
    const moveNotations: string[] = []

    for (const move of this.actions) {
      const pieceType = move.piece.type.toUpperCase()
      const dest = algebraic(move.to)
      const capture = move.flags & BITS.CAPTURE ? 'x' : ''

      // Handle carrying pieces (combined moves)
      if (move.piece.carrying && move.piece.carrying.length > 0) {
        const carryingTypes = move.piece.carrying
          .map((p) => p.type.toUpperCase())
          .join('')
        moveNotations.push(`${pieceType}(${carryingTypes})${capture}${dest}`)
      } else {
        moveNotations.push(`${pieceType}${capture}${dest}`)
      }
    }

    const movesStr = moveNotations.join(',')
    const unfinished = this.isComplete() ? '' : '...'

    return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:${movesStr}${unfinished}`
  }

  /**
   * Get a summary of the session for debugging.
   *
   * @returns Human-readable string representation
   */
  toString(): string {
    const remaining = this.getRemainingPieces()
    const remainingStr = remaining
      ? `${remaining.type}${remaining.carrying ? `(${remaining.carrying.map((p) => p.type).join('')})` : ''}`
      : 'none'

    return `DeploySession(square=${algebraic(this.stackSquare)}, moves=${this.actions.length}, remaining=${remainingStr})`
  }

  /**
   * Create a deep copy of the session.
   * Used for history snapshots.
   *
   * @returns A new DeploySession with copied data
   */
  clone(): DeploySession {
    return new DeploySession({
      stackSquare: this.stackSquare,
      turn: this.turn,
      originalPiece: { ...this.originalPiece },
      startFEN: this.startFEN,
      actions: this.actions.map((move) => ({ ...move })),
      stayPieces: this.stayPieces?.map((p) => ({ ...p })),
    })
  }
}
