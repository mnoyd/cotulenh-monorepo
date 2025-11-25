import { Color, Piece, InternalMove, BITS, algebraic } from './type.js'
import { flattenPiece, combinePieces } from './utils.js'
import { InternalDeployMove } from './deploy-move.js'
import {
  CTLMoveCommandInteface,
  createMoveCommand,
  DeployMoveCommand,
} from './move-apply.js'
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
  private readonly _game: CoTuLenh

  private readonly _commands: CTLMoveCommandInteface[] = []

  constructor(
    game: CoTuLenh,
    data: {
      stackSquare: number
      turn: Color
      originalPiece: Piece
    },
  ) {
    this._game = game
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
   * Commit the session to a single DeployMoveCommand
   */
  commit(): DeployMoveCommand {
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

    const internalDeployMove: InternalDeployMove = {
      from: this.stackSquare,
      moves: this.moves,
      stay: stay || undefined,
      captured: captured.length > 0 ? captured : undefined,
    }

    return new DeployMoveCommand(this._game, internalDeployMove, this.commands)
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
 * Builds a DeployMoveCommand from an InternalDeployMove by executing moves through a session.
 * This is used when reconstructing a deploy move (e.g., for undo/redo or history replay).
 *
 * @param game - The game instance
 * @param deployMove - The deploy move to build commands for
 * @returns A DeployMoveCommand with all commands built and ready
 */
export function buildDeployMoveCommands(
  game: CoTuLenh,
  deployMove: InternalDeployMove,
): CTLMoveCommandInteface[] {
  // Execute moves through handleDeployMove to ensure consistency
  // Pass autoCommit=false so we can capture the session
  for (const move of deployMove.moves) {
    handleDeployMove(game, move, false)
  }

  const session = game.getDeploySession()
  if (!session) {
    throw new Error(
      'Failed to create deploy session during buildDeployMoveCommands',
    )
  }

  // Capture the commands before undoing
  const commands = session.commands

  // IMPORTANT: We must undo all moves to restore the board state
  // because this function is used to BUILD a command that will be executed later.
  // The moves have already been executed on the board during handleDeployMove calls,
  // but we need to return a command that can be executed fresh.
  session.cancel()

  // Clear the session from the game
  game.setDeploySession(null)

  // Return the captured commands
  return commands
}

/**
 * Creates a DeployMoveCommand using session-based logic.
 * This ensures all deploy command creation goes through the same consistent path.
 *
 * @param game - The game instance
 * @param deployMove - The deploy move to create a command for
 * @returns A DeployMoveCommand ready to execute
 */
export function createDeployMoveCommand(
  game: CoTuLenh,
  deployMove: InternalDeployMove,
): DeployMoveCommand {
  const commands = buildDeployMoveCommands(game, deployMove)
  return new DeployMoveCommand(game, deployMove, commands)
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

    session = new DeploySession(game, {
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
