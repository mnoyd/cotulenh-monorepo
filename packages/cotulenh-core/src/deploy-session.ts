// src/deploy-session.ts

import {
  Color,
  Piece,
  InternalMove,
  BITS,
  DeployState,
  algebraic,
} from './type.js'
import { flattenPiece, combinePieces } from './utils.js'
import type { CTLMoveCommandInteface } from './move-apply.js'

/**
 * DeploySession tracks the state of an active deployment sequence.
 *
 * Stores the actual move commands (not just moves) so they can be:
 * - Undone individually during active session
 * - Combined into one DeployMoveCommand when committed
 * - Used for SAN generation (including partial "..." notation)
 *
 * Benefits:
 * - Clean history (no entries until commit)
 * - Proper undo during deployment
 * - Support for partial deploy display
 */
export class DeploySession {
  stackSquare: number
  turn: Color
  originalPiece: Piece
  commands: CTLMoveCommandInteface[] = [] // Store commands, not moves!
  startFEN: string
  stayPieces?: Piece[] // Pieces explicitly marked to stay

  constructor(data: {
    stackSquare: number
    turn: Color
    originalPiece: Piece
    startFEN: string
    commands?: CTLMoveCommandInteface[]
    actions?: InternalMove[] // Backward compatibility
    stayPieces?: Piece[]
  }) {
    this.stackSquare = data.stackSquare
    this.turn = data.turn
    this.originalPiece = data.originalPiece
    this.startFEN = data.startFEN

    // Handle both new commands and old actions for backward compatibility
    if (data.commands) {
      this.commands = data.commands
    } else if (data.actions) {
      // Convert old actions to mock commands for backward compatibility
      this.commands = data.actions.map((move) => ({
        move,
        execute: () => {}, // No-op for backward compatibility
        undo: () => {}, // No-op for backward compatibility
      }))
    } else {
      this.commands = []
    }

    this.stayPieces = data.stayPieces
  }

  /**
   * Get the InternalMove objects from commands (for compatibility)
   * Deploy sessions only contain single deploy moves, never batch InternalDeployMove
   */
  getActions(): InternalMove[] {
    return this.commands.map((cmd) => {
      const move = cmd.move
      // Deploy sessions should only have InternalMove, but type-guard for safety
      if ('moves' in move) {
        throw new Error(
          'Deploy session should not contain batch InternalDeployMove',
        )
      }
      return move
    })
  }

  /**
   * Backward compatibility: get actions as a property
   * @deprecated Use getActions() method instead
   */
  get actions(): InternalMove[] {
    return this.getActions()
  }

  /**
   * Backward compatibility: add move method
   * @deprecated Use addCommand() instead
   */
  addMove(move: InternalMove): void {
    // For backward compatibility, we need to create a mock command
    // This is not ideal but maintains API compatibility
    const mockCommand: CTLMoveCommandInteface = {
      move,
      execute: () => {}, // No-op for backward compatibility
      undo: () => {}, // No-op for backward compatibility
    }
    this.addCommand(mockCommand)
  }

  /**
   * Backward compatibility: undo last move method
   * @deprecated Use undoLastCommand() instead
   */
  undoLastMove(): InternalMove | null {
    const command = this.undoLastCommand()
    if (!command) return null

    const move = command.move
    if ('moves' in move) {
      throw new Error(
        'Deploy session should not contain batch InternalDeployMove',
      )
    }
    return move
  }

  /**
   * Calculate remaining pieces by subtracting moved pieces from original.
   * This is the core method that replaces the old movedPieces array.
   *
   * @returns The piece (potentially a stack) remaining at the stack square,
   *          or null if all pieces have been deployed
   */
  getRemainingPieces(): Piece | null {
    const originalFlat = flattenPiece(this.originalPiece)

    // Start with all original pieces
    const remainingPieces = [...originalFlat]

    // Remove pieces that have been deployed
    for (const command of this.commands) {
      const move = command.move
      if ('moves' in move) continue // Type guard

      // Only count moves FROM the stack square with DEPLOY flag
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        const deployedPieces = flattenPiece(move.piece)

        // Remove each deployed piece from remaining
        for (const deployedPiece of deployedPieces) {
          const index = remainingPieces.findIndex(
            (p) => p.type === deployedPiece.type,
          )
          if (index !== -1) {
            remainingPieces.splice(index, 1)
          }
        }
      }
    }

    // If no pieces remain, return null
    if (remainingPieces.length === 0) {
      return null
    }

    // Combine remaining pieces into a stack
    return combinePieces(remainingPieces)
  }

  /**
   * Get all squares where pieces from this stack were deployed.
   * Used for generating recombine moves.
   *
   * @returns Array of square indices where pieces were deployed
   */
  getDeployedSquares(): number[] {
    const squares = new Set<number>()

    for (const command of this.commands) {
      const move = command.move
      if ('moves' in move) continue // Type guard
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        squares.add(move.to)
      }
    }

    return Array.from(squares)
  }

  /**
   * Add a command to the session.
   * Called when a deploy move is executed.
   *
   * @param command The command to add to the session
   */
  addCommand(command: CTLMoveCommandInteface): void {
    this.commands.push(command)
  }

  /**
   * Remove and return the last command from the session.
   * Used for undo during deployment.
   *
   * @returns The removed command, or null if no commands to undo
   */
  undoLastCommand(): CTLMoveCommandInteface | null {
    return this.commands.pop() || null
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
    if (this.commands.length === 0) return false

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
    const movedCount = this.commands.reduce(
      (sum: number, command: CTLMoveCommandInteface) => {
        const move = command.move
        if ('moves' in move) return sum // Type guard
        if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
          return sum + flattenPiece(move.piece).length
        }
        return sum
      },
      0,
    )

    const stayCount = this.stayPieces?.length || 0

    return movedCount + stayCount === originalFlat.length
  }

  /**
   * Cancel the session and return moves to undo in reverse order.
   * Used when user wants to abort the deployment.
   *
   * @returns Array of moves in reverse order for undoing
   */
  cancel(): InternalMove[] {
    const movesToUndo: InternalMove[] = []

    // Collect moves in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const command = this.commands[i]
      const move = command.move
      if ('moves' in move) {
        throw new Error(
          'Deploy session should not contain batch InternalDeployMove',
        )
      }
      movesToUndo.push(move)
    }

    return movesToUndo
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

    for (const command of this.commands) {
      const move = command.move
      if ('moves' in move) continue // Type guard
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
    if (this.commands.length === 0) {
      // No moves yet, just indicate deploy started
      return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:`
    }

    // Generate SAN notation for the moves
    // Format: Nc5,Fd4,Te5 (piece type + destination)
    const moveNotations: string[] = []

    for (const command of this.commands) {
      const move = command.move
      if ('moves' in move) continue // Type guard
      const pieceType = move.piece.type.toUpperCase()
      const dest = algebraic(move.to)
      const capture = move.flags & BITS.CAPTURE ? 'x' : ''

      // Handle carrying pieces (combined moves)
      if (move.piece.carrying && move.piece.carrying.length > 0) {
        const carryingTypes = move.piece.carrying
          .map((p: Piece) => p.type.toUpperCase())
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
      ? `${remaining.type}${remaining.carrying ? `(${remaining.carrying.map((p: Piece) => p.type).join('')})` : ''}`
      : 'none'

    return `DeploySession(square=${algebraic(this.stackSquare)}, moves=${this.commands.length}, remaining=${remainingStr})`
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
      commands: [...this.commands], // Create a new array with same commands
      stayPieces: this.stayPieces?.map((p: Piece) => ({ ...p })),
    })
  }
}
