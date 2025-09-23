import { Color, Piece, PieceSymbol, InternalMove } from './type.js'
import { flattenPiece } from './utils.js'

/**
 * Represents an active deploy session where pieces from a stack
 * are being moved incrementally rather than all at once.
 */
export class DeploySession {
  private _stackSquare: number
  private _turn: Color
  private _originalPieces: Piece[]
  private _movedPieces: Piece[]
  private _stayPieces: Piece[]
  private _executedMoves: InternalMove[]
  private _isActive: boolean

  constructor(stackSquare: number, turn: Color, originalStack: Piece) {
    this._stackSquare = stackSquare
    this._turn = turn
    this._originalPieces = flattenPiece(originalStack)
    this._movedPieces = []
    this._stayPieces = []
    this._executedMoves = []
    this._isActive = true
  }

  /**
   * Get the original stack square
   */
  get stackSquare(): number {
    return this._stackSquare
  }

  /**
   * Get the player executing the deploy
   */
  get turn(): Color {
    return this._turn
  }

  /**
   * Get all original pieces in the stack
   */
  get originalPieces(): Piece[] {
    return [...this._originalPieces]
  }

  /**
   * Get pieces that have already been moved
   */
  get movedPieces(): Piece[] {
    return [...this._movedPieces]
  }

  /**
   * Get pieces that are staying on the original square
   */
  get stayPieces(): Piece[] {
    return [...this._stayPieces]
  }

  /**
   * Get all moves executed in this deploy session
   */
  get executedMoves(): InternalMove[] {
    return [...this._executedMoves]
  }

  /**
   * Check if deploy session is still active
   */
  get isActive(): boolean {
    return this._isActive
  }

  /**
   * Get pieces that haven't been moved or designated to stay yet
   */
  get remainingPieces(): Piece[] {
    const processedPieces = [...this._movedPieces, ...this._stayPieces]

    return this._originalPieces.filter((originalPiece) => {
      // Find if this piece has been processed
      const processedIndex = processedPieces.findIndex(
        (processed) =>
          processed.type === originalPiece.type &&
          processed.color === originalPiece.color,
      )

      if (processedIndex !== -1) {
        // Remove the processed piece to handle duplicates correctly
        processedPieces.splice(processedIndex, 1)
        return false
      }

      return true
    })
  }

  /**
   * Get available piece types that can still move
   */
  get availablePieceTypes(): PieceSymbol[] {
    const remaining = this.remainingPieces
    const uniqueTypes = new Set<PieceSymbol>()

    remaining.forEach((piece) => uniqueTypes.add(piece.type))

    return Array.from(uniqueTypes)
  }

  /**
   * Check if a specific piece type can still move
   */
  canMovePieceType(pieceType: PieceSymbol): boolean {
    return this.remainingPieces.some((piece) => piece.type === pieceType)
  }

  /**
   * Record that a piece has moved
   */
  recordPieceMove(piece: Piece, move: InternalMove): void {
    if (!this._isActive) {
      throw new Error('Deploy session is not active')
    }

    // Verify the piece exists in remaining pieces
    const remainingIndex = this.remainingPieces.findIndex(
      (p) => p.type === piece.type && p.color === piece.color,
    )

    if (remainingIndex === -1) {
      throw new Error(`Piece ${piece.type} not available for deploy move`)
    }

    this._movedPieces.push(piece)
    this._executedMoves.push(move)

    // Check if deploy is complete
    this._checkDeployCompletion()
  }

  /**
   * Record that a piece is staying on the original square
   */
  recordPieceStay(piece: Piece): void {
    if (!this._isActive) {
      throw new Error('Deploy session is not active')
    }

    // Verify the piece exists in remaining pieces
    const remainingIndex = this.remainingPieces.findIndex(
      (p) => p.type === piece.type && p.color === piece.color,
    )

    if (remainingIndex === -1) {
      throw new Error(`Piece ${piece.type} not available to stay`)
    }

    this._stayPieces.push(piece)

    // Check if deploy is complete
    this._checkDeployCompletion()
  }

  /**
   * Check if all pieces have been accounted for and complete deploy if so
   */
  private _checkDeployCompletion(): void {
    const totalProcessed = this._movedPieces.length + this._stayPieces.length
    const totalOriginal = this._originalPieces.length

    if (totalProcessed === totalOriginal) {
      this._isActive = false
    }
  }

  /**
   * Force complete the deploy session
   */
  complete(): void {
    this._isActive = false
  }

  /**
   * Check if deploy session is complete
   */
  isComplete(): boolean {
    return !this._isActive
  }

  /**
   * Get a summary of the deploy session
   */
  getSummary(): {
    stackSquare: number
    turn: Color
    totalPieces: number
    movedPieces: number
    stayPieces: number
    remainingPieces: number
    isComplete: boolean
  } {
    return {
      stackSquare: this._stackSquare,
      turn: this._turn,
      totalPieces: this._originalPieces.length,
      movedPieces: this._movedPieces.length,
      stayPieces: this._stayPieces.length,
      remainingPieces: this.remainingPieces.length,
      isComplete: this.isComplete(),
    }
  }

  /**
   * Convert to the legacy DeployState format for compatibility
   */
  toLegacyDeployState(): {
    stackSquare: number
    turn: Color
    originalPiece: Piece
    movedPieces: Piece[]
    stay?: Piece[]
  } | null {
    if (!this._isActive) return null

    // Reconstruct the original combined piece
    // This is a simplified reconstruction - you may need more sophisticated logic
    const originalPiece: Piece = {
      type: this._originalPieces[0].type,
      color: this._originalPieces[0].color,
      carrying: this._originalPieces.slice(1),
    }

    return {
      stackSquare: this._stackSquare,
      turn: this._turn,
      originalPiece,
      movedPieces: this._movedPieces,
      stay: this._stayPieces.length > 0 ? this._stayPieces : undefined,
    }
  }
}
