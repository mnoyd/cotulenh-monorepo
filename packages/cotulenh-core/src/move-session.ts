import {
  Color,
  Piece,
  InternalMove,
  BITS,
  algebraic,
  FLAGS,
  type MoveResult,
} from './type.js'
import { flattenPiece, combinePieces } from './utils.js'
import { CTLMoveCommandInteface, createMoveCommand } from './move-apply.js'
import type { CoTuLenh } from './cotulenh.js'
import { Move } from './cotulenh.js'
import { DeployMove } from './deploy-move.js'

export type { MoveResult } from './type.js'

/**
 * MoveSession tracks moves (normal or deploy) before committing to history.
 *
 * Unified Design:
 * - Both normal and deploy moves go through a session
 * - Normal moves: create session, add 1 move, auto-commit
 * - Deploy moves: create session, add N moves, manual commit
 * - Session converts InternalMove → Command → executes
 * - Commit produces: CTLMoveCommandInteface + (Move | DeployMove)
 * - Generates SAN/LAN/FEN internally without temporary execute/undo
 */
export class MoveSession {
  public readonly stackSquare: number
  public readonly turn: Color
  public readonly originalPiece: Piece
  public readonly isDeploy: boolean
  public readonly beforeCommanders: Record<Color, number>
  private readonly _game: CoTuLenh
  private readonly _beforeFEN: string
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
    // Capture FEN before any moves
    this._beforeFEN = game.fen()
    // Capture commander positions before any moves
    this.beforeCommanders = game.getCommandersSnapshot()
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
   * Create a MoveResult for an intermediate deploy step
   * Simple placeholder - real notation generated at commit
   */
  createIntermediateResult(): MoveResult {
    // Simple placeholder for intermediate steps
    const san = 'DEPLOY...'
    const lan = 'DEPLOY...'

    // Create a minimal Move object for intermediate state
    const moveObj = Move.fromExecutedMove({
      color: this.turn,
      from: algebraic(this.stackSquare),
      to: algebraic(this.stackSquare), // Placeholder
      piece: this.originalPiece,
      captured: undefined,
      flags: 'd', // Deploy flag
      before: this._beforeFEN,
      after: this._game.fen(),
      san,
      lan,
    })

    return {
      completed: false,
      move: moveObj,
      san,
      lan,
    }
  }

  /**
   * Commit the session
   * Generates SAN/LAN/FEN at commit time
   * Returns: command for history + Move/DeployMove object + MoveResult
   */
  commit(): {
    command: CTLMoveCommandInteface
    moveObject: Move | DeployMove
    result: MoveResult
  } {
    if (this._commands.length === 0) {
      throw new Error('Cannot commit empty session')
    }

    // Capture after FEN (board already updated)
    const afterFEN = this._game.fen()

    if (this.isDeploy) {
      // === DEPLOY MOVE ===
      const remaining = this.remaining
      const stay = remaining.length > 0 ? combinePieces(remaining) : undefined

      // Collect captured pieces
      const captured: Piece[] = []
      for (const cmd of this._commands) {
        if (cmd.move.captured) captured.push(cmd.move.captured)
      }

      // Create wrapper command for history
      const deployCommand: CTLMoveCommandInteface = {
        move: {
          color: this.turn,
          from: this.stackSquare,
          to: this.stackSquare,
          piece: this.originalPiece,
          flags: BITS.DEPLOY,
        },
        execute: () => {
          // Already executed
        },
        undo: () => {
          for (let i = this._commands.length - 1; i >= 0; i--) {
            this._commands[i].undo()
          }
        },
      }

      // Build destination map
      const toMap = new Map<string, Piece>()
      for (const move of this.moves) {
        toMap.set(algebraic(move.to), move.piece)
      }

      // Generate notation
      const san = 'DEPLOY' // TODO: proper SAN
      const lan = 'DEPLOY' // TODO: proper LAN

      // Create DeployMove object
      const deployMove = DeployMove.fromSession({
        color: this.turn,
        from: algebraic(this.stackSquare),
        to: toMap,
        stay: stay ?? undefined,
        captured: captured.length > 0 ? captured : undefined,
        before: this._beforeFEN,
        after: afterFEN,
        san,
        lan,
      })

      const result: MoveResult = {
        completed: true,
        move: deployMove,
        san,
        lan,
      }

      return { command: deployCommand, moveObject: deployMove, result }
    } else {
      // === NORMAL MOVE ===
      const command = this._commands[0]
      const move = command.move

      // Generate notation (simple for now)
      const san = `${move.piece.type.toUpperCase()}${algebraic(move.to)}`
      const lan = `${algebraic(move.from)}-${algebraic(move.to)}`

      // Build flags string
      let flagsStr = ''
      for (const flag in BITS) {
        if (BITS[flag] & move.flags) {
          flagsStr += FLAGS[flag]
        }
      }

      // Create Move object
      const moveObj = Move.fromExecutedMove({
        color: move.color,
        from: algebraic(move.from),
        to: algebraic(move.to),
        piece: move.piece,
        captured: move.captured,
        flags: flagsStr,
        before: this._beforeFEN,
        after: afterFEN,
        san,
        lan,
      })

      const result: MoveResult = {
        completed: true,
        move: moveObj,
        san,
        lan,
      }

      return { command, moveObject: moveObj, result }
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

// Backward compatibility alias
export const DeploySession = MoveSession

/**
 * Handles a move (normal or deploy) by creating or updating a session.
 *
 * Unified handling:
 * - Detects deploy vs normal from move.flags & BITS.DEPLOY
 * - Deploy moves: create/update session, auto-commit when complete
 * - Normal moves: create session, add move, auto-commit immediately
 *
 * @param game - The game instance
 * @param move - The internal move to process
 * @param autoCommit - Whether to automatically commit the session when complete (default: true)
 * @returns MoveResult indicating completion status and move object
 */
export function handleMove(
  game: CoTuLenh,
  move: InternalMove,
  autoCommit: boolean = true,
): MoveResult {
  const isDeploy = (move.flags & BITS.DEPLOY) !== 0
  let session = game.getSession()

  if (!session) {
    // Start new session
    const stackSquare = move.from
    const originalPiece = game.get(stackSquare)

    if (!originalPiece) {
      throw new Error(
        `No piece at ${algebraic(stackSquare)} to start move session`,
      )
    }

    session = new MoveSession(game, {
      stackSquare,
      turn: game.turn(),
      originalPiece: structuredClone(originalPiece),
      isDeploy,
    })
    game.setSession(session)
  }

  // Add move to session (executes immediately)
  session.addMove(move)

  // Check if complete and should auto-commit
  if (session.isComplete && autoCommit) {
    // Commit and return completed result
    const commitResult = game.commitSession()
    if (commitResult.success && commitResult.result) {
      return commitResult.result
    }
    // If commit failed, return intermediate
    return session.createIntermediateResult()
  }

  // Return intermediate result (not complete yet)
  return session.createIntermediateResult()
}
