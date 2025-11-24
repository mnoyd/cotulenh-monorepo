import { Color, Piece, InternalMove, BITS, algebraic } from './type.js'
import { flattenPiece, combinePieces } from './utils.js'
import { InternalDeployMove } from './deploy-move.js'
import { CTLMoveCommandInteface, createMoveCommand } from './move-apply.js'
import type { CoTuLenh } from './cotulenh.js'

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

  private readonly _commands: CTLMoveCommandInteface[] = []

  constructor(data: {
    stackSquare: number
    turn: Color
    originalPiece: Piece
  }) {
    this.stackSquare = data.stackSquare
    this.turn = data.turn
    this.originalPiece = data.originalPiece
  }

  /**
   * Add a deploy command to the session
   * Executes the command and updates state immediately
   */
  addCommand(command: CTLMoveCommandInteface): void {
    command.execute()
    this._commands.push(command)
  }

  /**
   * Cancel the session by undoing all commands
   */
  cancel(): void {
    while (this._commands.length > 0) {
      this.undoCommand()
    }
  }

  /**
   * Undo the last command
   * Undoes the command and restores state immediately
   */
  undoCommand(): CTLMoveCommandInteface | undefined {
    const command = this._commands.pop()
    if (!command) return undefined

    // Undo command execution
    command.undo()

    return command
  }

  /**
   * Get the pieces remaining in the stack
   */
  get remaining(): Piece[] {
    const remaining = flattenPiece(this.originalPiece)
    for (const move of this.moves) {
      const deployedPieces = flattenPiece(move.piece)
      for (const deployedPiece of deployedPieces) {
        const index = remaining.findIndex((p) => p.type === deployedPiece.type)
        if (index !== -1) {
          remaining.splice(index, 1)
        }
      }
    }
    return remaining
  }

  /**
   * Check if deployment is complete (all pieces deployed)
   */
  get isComplete(): boolean {
    return this.remaining.length === 0
  }

  /**
   * Check if the session is empty (no commands executed)
   */
  get isEmpty(): boolean {
    return this._commands.length === 0
  }

  /**
   * Execute a batch of moves and add them to the session
   */
  executeMoves(game: CoTuLenh, moves: InternalMove[]): void {
    for (const move of moves) {
      const command = createMoveCommand(game, move)
      this.addCommand(command)
    }
  }

  /**
   * Get all moves made in this session
   */
  get moves(): InternalMove[] {
    return this._commands.map((c) => c.move as InternalMove)
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
    if (this._commands.length === 0) {
      throw new Error('Cannot commit empty deploy session')
    }

    const remaining = this.remaining
    const stay = remaining.length > 0 ? combinePieces(remaining) : undefined

    // Collect captured pieces from all moves
    const captured: Piece[] = []
    for (const command of this._commands) {
      const move = command.move as InternalMove
      if (move.captured) captured.push(move.captured)
    }

    return {
      from: this.stackSquare,
      moves: this.moves,
      stay: stay || undefined,
      captured: captured.length > 0 ? captured : undefined,
    }
  }

  /**
   * Generates the FEN string for the current deploy session
   */
  toFenString(baseFEN: string): string {
    if (this._commands.length === 0) {
      return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:`
    }

    const moveNotations: string[] = []
    for (const command of this._commands) {
      const move = command.move as InternalMove
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

/**
 * Handles a deploy move by creating or updating a deploy session.
 *
 * @param game - The game instance
 * @param move - The internal move to process
 * @param autoCommit - Whether to automatically commit the session when complete (default: true)
 * @returns True if the deploy session is complete, false otherwise
 */
export function handleDeployMove(
  game: CoTuLenh,
  move: InternalMove,
  autoCommit: boolean = true,
): boolean {
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
      originalPiece: structuredClone(originalPiece), // Deep copy
    })
    game.setDeploySession(session)
  }

  // Create command
  const command = createMoveCommand(game, move)

  // Add to session (executes command)
  session.addCommand(command)

  if (session.isComplete && autoCommit) {
    game.commitDeploySession()
  }

  return session.isComplete
}
