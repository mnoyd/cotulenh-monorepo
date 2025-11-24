import {
  Color,
  Piece,
  InternalMove,
  BITS,
  algebraic,
  swapColor,
} from './type.js'
import { flattenPiece, combinePieces } from './utils.js'
import { InternalDeployMove } from './deploy-move.js'
import { CTLMoveCommandInteface } from './move-apply.js'

/**
 * DeploySession tracks the state of an active deployment sequence.
 *
 * Simplified Design:
 * - Tracks remaining pieces directly
 * - Tracks deployed pieces by square
 * - No complex history replay or event sourcing
 * - No static managers - purely a state container
 */
export class DeploySession {
  public readonly stackSquare: number
  public readonly turn: Color
  public readonly originalPiece: Piece

  // State
  private _remainingPieces: Piece[]
  private _moves: InternalMove[] = []
  private _commands: CTLMoveCommandInteface[] = []

  constructor(data: {
    stackSquare: number
    turn: Color
    originalPiece: Piece
  }) {
    this.stackSquare = data.stackSquare
    this.turn = data.turn
    this.originalPiece = data.originalPiece
    this._remainingPieces = flattenPiece(data.originalPiece)
  }

  /**
   * Add a deploy move to the session
   * Updates state immediately
   */
  addMove(move: InternalMove, command?: CTLMoveCommandInteface): void {
    // 1. Validate move source
    if (move.from !== this.stackSquare) {
      throw new Error(
        `Deploy move must start from stack square ${algebraic(this.stackSquare)}`,
      )
    }

    // 2. Update remaining pieces
    const deployedPieces = flattenPiece(move.piece)
    for (const deployedPiece of deployedPieces) {
      const index = this._remainingPieces.findIndex(
        (p) => p.type === deployedPiece.type,
      )
      if (index === -1) {
        throw new Error(`Piece ${deployedPiece.type} not available in stack`)
      }
      this._remainingPieces.splice(index, 1)
    }

    // 3. Record move
    this._moves.push(move)
    if (command) {
      this._commands.push(command)
    }
  }

  /**
   * Undo the last move
   * Restores state immediately
   */
  undo(): { move: InternalMove; command?: CTLMoveCommandInteface } | undefined {
    const move = this._moves.pop()
    const command = this._commands.pop()
    if (!move) return undefined

    // Restore pieces to remaining
    const deployedPieces = flattenPiece(move.piece)
    this._remainingPieces.push(...deployedPieces)

    return { move, command }
  }

  /**
   * Get the pieces remaining in the stack
   */
  get remaining(): Piece[] {
    return [...this._remainingPieces]
  }

  /**
   * Check if deployment is complete (all pieces deployed)
   */
  get isComplete(): boolean {
    return this._remainingPieces.length === 0
  }

  /**
   * Get all moves made in this session
   */
  get moves(): InternalMove[] {
    return [...this._moves]
  }

  /**
   * Get all commands executed in this session
   */
  get commands(): CTLMoveCommandInteface[] {
    return [...this._commands]
  }

  /**
   * Commit the session to a single InternalDeployMove
   */
  commit(): InternalDeployMove {
    if (this._moves.length === 0) {
      throw new Error('Cannot commit empty deploy session')
    }

    const stay =
      this._remainingPieces.length > 0
        ? combinePieces(this._remainingPieces)
        : undefined

    // Collect captured pieces from all moves
    const captured: Piece[] = []
    for (const move of this._moves) {
      if (move.captured) captured.push(move.captured)
    }

    return {
      from: this.stackSquare,
      moves: this._moves,
      stay: stay || undefined,
      captured: captured.length > 0 ? captured : undefined,
    }
  }

  /**
   * Generates the FEN string for the current deploy session
   */
  toFenString(baseFEN: string): string {
    if (this._moves.length === 0) {
      return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:`
    }

    const moveNotations: string[] = []
    for (const move of this._moves) {
      const pieceType = move.piece.type.toUpperCase()
      const dest = algebraic(move.to)
      const capture = move.flags & BITS.CAPTURE ? 'x' : ''

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
    const unfinished = this.isComplete ? '' : '...'
    return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:${movesStr}${unfinished}`
  }
}

import type { CoTuLenh } from './cotulenh.js'
import { createMoveCommand } from './move-apply.js'

/**
 * Handles a deploy move by creating or updating a deploy session.
 *
 * @param game - The game instance
 * @param move - The internal move to process
 * @returns True if the deploy session is complete, false otherwise
 */
export function handleDeployMove(game: CoTuLenh, move: InternalMove): boolean {
  let session = game.getDeploySession()

  if (!session) {
    // Start new session
    const stackSquare = move.from
    const originalPiece = game.get(stackSquare)

    if (!originalPiece) {
      throw new Error(
        `No piece at ${algebraic(stackSquare)} to start deploy session`,
      )
    }

    session = new DeploySession({
      stackSquare,
      turn: game.turn(),
      originalPiece: JSON.parse(JSON.stringify(originalPiece)), // Deep copy
    })
    game.setDeploySession(session)
  }

  // Create command
  const command = createMoveCommand(game, move)

  // Execute command (updates board)
  command.execute()

  // Add to session
  session.addMove(move, command)

  return session.isComplete
}
