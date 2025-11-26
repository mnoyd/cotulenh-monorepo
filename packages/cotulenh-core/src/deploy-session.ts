import { Color, Piece, InternalMove, BITS, algebraic } from './type.js'
import { flattenPiece, combinePieces } from './utils.js'
import { CTLMoveCommandInteface, createMoveCommand } from './move-apply.js'
import type { CoTuLenh } from './cotulenh.js'
import { Move } from './cotulenh.js'
import { DeployMove } from './deploy-move.js'

/**
 * MoveSession tracks moves (normal or deploy) before committing to history.
 *
 * Unified Design:
 * - Both normal and deploy moves go through a session
 * - Normal moves: create session, add 1 move, auto-commit
 * - Deploy moves: create session, add N moves, manual commit
 * - Session converts InternalMove → Command → executes
 * - Commit produces: CTLMoveCommandInteface + (Move | DeployMove)
 */
export class MoveSession {
  public readonly stackSquare: number
  public readonly turn: Color
  public readonly originalPiece: Piece
  public readonly isDeploy: boolean
  private readonly _game: CoTuLenh

  private readonly _commands: CTLMoveCommandInteface[] = []

  constructor(
    game: CoTuLenh,
    data: {
      stackSquare: number
      turn: Color
      originalPiece: Piece
      isDeploy: boolean
    },
  ) {
    this._game = game
    this.stackSquare = data.stackSquare
    this.turn = data.turn
    this.originalPiece = data.originalPiece
    this.isDeploy = data.isDeploy
  }

  /**
   * Add an InternalMove to the session
   * Converts to command and executes immediately
   */
  addMove(move: InternalMove): void {
    const command = createMoveCommand(this._game, move)
    command.execute()
    this._commands.push(command)
  }

  /**
   * Cancel the session by undoing all commands
   */
  cancel(): void {
    while (this._commands.length > 0) {
      this.undoLastMove()
    }
  }

  /**
   * Undo the last move
   */
  undoLastMove(): InternalMove | undefined {
    const command = this._commands.pop()
    if (!command) return undefined

    command.undo()
    this._game['_movesCache'].clear()
    return command.move
  }

  /**
   * Get the pieces remaining in the stack (for deploy moves)
   */
  get remaining(): Piece[] {
    if (!this.isDeploy) return []

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
    if (!this.isDeploy) return this._commands.length > 0
    return this.remaining.length === 0
  }

  /**
   * Check if the session is empty
   */
  get isEmpty(): boolean {
    return this._commands.length === 0
  }

  /**
   * Get all moves made in this session
   */
  get moves(): InternalMove[] {
    return this._commands.map((c) => c.move)
  }

  /**
   * Get all commands executed in this session
   */
  get commands(): CTLMoveCommandInteface[] {
    return [...this._commands]
  }

  /**
   * Commit the session
   * Returns: command for history + Move/DeployMove object for API
   */
  commit(): {
    command: CTLMoveCommandInteface
    moveObject: Move | DeployMove
  } {
    if (this._commands.length === 0) {
      throw new Error('Cannot commit empty session')
    }

    const beforeFEN = this._game.fen() // This should be captured before session started

    if (this.isDeploy) {
      // Deploy move: wrap all commands
      const remaining = this.remaining
      const stay = remaining.length > 0 ? combinePieces(remaining) : undefined

      // Collect captured pieces
      const captured: Piece[] = []
      for (const cmd of this._commands) {
        if (cmd.move.captured) captured.push(cmd.move.captured)
      }

      // Create wrapper command
      const deployCommand: CTLMoveCommandInteface = {
        move: {
          color: this.turn,
          from: this.stackSquare,
          to: this.stackSquare, // Deploy doesn't have single "to"
          piece: this.originalPiece,
          flags: BITS.DEPLOY,
        },
        execute: () => {
          // Already executed
        },
        undo: () => {
          // Undo all commands in reverse
          for (let i = this._commands.length - 1; i >= 0; i--) {
            this._commands[i].undo()
          }
        },
      }

      // Create DeployMove object
      const afterFEN = this._game.fen()
      const toMap = new Map<string, Piece>()
      for (const move of this.moves) {
        toMap.set(algebraic(move.to), move.piece)
      }

      const deployMove = DeployMove.fromSession({
        color: this.turn,
        from: algebraic(this.stackSquare),
        to: toMap,
        stay: stay ?? undefined,
        captured: captured.length > 0 ? captured : undefined,
        before: beforeFEN,
        after: afterFEN,
        san: 'DEPLOY', // TODO: proper SAN
        lan: 'DEPLOY', // TODO: proper LAN
      })

      return { command: deployCommand, moveObject: deployMove }
    } else {
      // Normal move: single command
      const command = this._commands[0]
      const move = new Move(this._game, command.move)
      return { command, moveObject: move }
    }
  }

  /**
   * Generates the FEN string for the current deploy session
   */
  toFenString(baseFEN: string): string {
    if (!this.isDeploy) return baseFEN

    if (this._commands.length === 0) {
      return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:`
    }

    const moveNotations: string[] = []
    for (const command of this._commands) {
      const move = command.move
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

// Backward compatibility: DeploySession = MoveSession with isDeploy=true
export class DeploySession extends MoveSession {
  constructor(
    game: CoTuLenh,
    data: {
      stackSquare: number
      turn: Color
      originalPiece: Piece
    },
  ) {
    super(game, { ...data, isDeploy: true })
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

    session = new DeploySession(game, {
      stackSquare,
      turn: game.turn(),
      originalPiece: structuredClone(originalPiece),
    })
    game.setDeploySession(session)
  }

  // Add move to session (converts to command and executes)
  session.addMove(move)

  if (session.isComplete && autoCommit) {
    game.commitDeploySession()
  }

  return session.isComplete
}
