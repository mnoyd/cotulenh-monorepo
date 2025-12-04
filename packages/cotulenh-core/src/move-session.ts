import {
  Color,
  Piece,
  InternalMove,
  BITS,
  algebraic,
  FLAGS,
  Square,
} from './type.js'
import { flattenPiece, combinePieces } from './utils.js'
import { CTLMoveCommandInteface, createMoveCommand } from './move-apply.js'
import type { CoTuLenh } from './cotulenh.js'

/**
 * Result of a move operation
 * Indicates whether the move sequence is complete and provides the move object
 */
/**
 * Result of a move operation
 * Indicates whether the move sequence is complete and provides the move object
 */
export type MoveResult = Move | DeployMove

// Public Move class (similar to chess.js) - can be fleshed out later
export class Move {
  color!: Color
  from!: Square
  to!: Square // Destination square (piece's final location)
  piece!: Piece
  captured?: Piece
  flags!: string // String representation of flags
  san?: string // Standard Algebraic Notation (needs implementation)
  lan?: string // Long Algebraic Notation (needs implementation)
  before!: string // FEN before move
  after!: string // FEN after move
  completed: boolean = true // Default to true for normal moves

  // Old constructor removed - use Move.fromExecutedMove() instead

  /**
   * Create Move from already-executed move data (preferred for deploy session moves).
   * No game state manipulation required - all data provided directly.
   *
   * @param data - Complete move data
   * @returns Move instance
   */
  static fromExecutedMove(data: {
    color: Color
    from: Square
    to: Square
    piece: Piece
    captured?: Piece
    flags: string
    before: string
    after: string
    san: string
    lan: string
    completed?: boolean
  }): Move {
    const move = Object.create(Move.prototype)
    // console.log('Move created:', move, 'Prototype:', Object.getPrototypeOf(move), 'Has method:', typeof move.isSuicideCapture)
    move.color = data.color
    move.from = data.from
    move.to = data.to
    move.piece = data.piece
    move.captured = data.captured
    move.flags = data.flags
    move.before = data.before
    move.after = data.after
    move.san = data.san
    move.lan = data.lan
    move.completed = data.completed ?? true
    return move
  }

  // Add helper methods like isCapture(), isPromotion() etc. if needed
  isCapture(): boolean {
    return this.flags.indexOf(FLAGS.CAPTURE) > -1
  }

  isStayCapture(): boolean {
    return this.flags.indexOf(FLAGS.STAY_CAPTURE) > -1
  }

  isDeploy(): boolean {
    return this.flags.indexOf(FLAGS.DEPLOY) > -1
  }

  isCombination(): boolean {
    return this.flags.indexOf(FLAGS.COMBINATION) > -1
  }

  isSuicideCapture(): boolean {
    return this.flags.indexOf(FLAGS.SUICIDE_CAPTURE) > -1
  }
}

export class DeployMove {
  color!: Color
  from!: Square
  to!: Map<Square, Piece> // Destination square (piece's final location)
  piece!: Piece // The main piece being deployed
  stay: Piece | undefined
  captured?: Piece[]
  san?: string // Standard Algebraic Notation (needs implementation)
  lan?: string // Long Algebraic Notation (needs implementation)
  before!: string // FEN before move
  after!: string // FEN after move

  /**
   * Create DeployMove from session data (preferred method).
   * No game state manipulation required - all data provided by session.
   *
   * @param data - Complete move data from DeploySession
   * @returns DeployMove instance
   */
  static fromSession(data: {
    color: Color
    from: Square
    to: Map<Square, Piece>
    piece: Piece
    stay?: Piece
    captured?: Piece[]
    before: string
    after: string
    san: string
    lan: string
    completed?: boolean
  }): DeployMove {
    const move = Object.create(DeployMove.prototype)
    move.color = data.color
    move.from = data.from
    move.to = data.to
    move.piece = data.piece
    move.stay = data.stay
    move.captured = data.captured
    move.before = data.before
    move.after = data.after
    move.san = data.san
    move.lan = data.lan
    move.completed = data.completed ?? true
    return move
  }

  isDeploy(): boolean {
    return true
  }

  isCapture(): boolean {
    return false
  }

  isStayCapture(): boolean {
    return false
  }

  isCombination(): boolean {
    return false
  }

  isSuicideCapture(): boolean {
    return false
  }
}

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

  get startFEN(): string {
    return this._beforeFEN
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

    return moveObj
  }

  /**
   * Generates commit data without finalizing the state.
   * @private
   */
  private _generateCommitData(): {
    command: CTLMoveCommandInteface
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
      const san = this.moves.map((m) => m.san || 'DEPLOY').join(' ')
      const lan = this.moves.map((m) => m.lan || 'DEPLOY').join(' ')

      // Create DeployMove object
      const deployMove = DeployMove.fromSession({
        color: this.turn,
        from: algebraic(this.stackSquare),
        to: toMap,
        piece: this.originalPiece,
        stay: stay ?? undefined,
        captured: captured.length > 0 ? captured : undefined,
        before: this._beforeFEN,
        after: afterFEN,
        san,
        lan,
      })

      return {
        command: deployCommand,
        result: deployMove,
      }
    } else {
      // === NORMAL MOVE ===
      const command = this._commands[0]
      const move = command.move

      // Generate notation
      const san =
        move.san || `${move.piece.type.toUpperCase()}${algebraic(move.to)}`
      const lan =
        move.lan ||
        `${move.piece.type.toUpperCase()}${algebraic(move.from)}${algebraic(
          move.to,
        )}`

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

      return { command, result: moveObj }
    }
  }

  /**
   * Commits the session: validates and generates final commit data.
   * Does NOT modify game state (history, turn, etc).
   * @returns Data needed for the game to apply the commit.
   * @throws An error if the move is invalid (e.g., leaves the commander in check).
   */
  commit(): {
    command: CTLMoveCommandInteface
    result: MoveResult
    hasCapture: boolean
    commandersToStore: Record<Color, number>
  } {
    const game = this._game
    const us = this.turn

    // DELAYED VALIDATION: Check commander safety after all moves
    // This allows deploy sequences to escape check
    if (game['_isCommanderAttacked'](us) || game['_isCommanderExposed'](us)) {
      throw new Error(
        'Move sequence does not escape check. Commander still in danger.',
      )
    }

    // 1. Generate commit data (command and result object)
    const { command, result } = this._generateCommitData()

    // 2. Check if any capture (check all moves in session)
    const hasCapture = this.moves.some((m) => !!(m.flags & BITS.CAPTURE))

    return {
      command,
      result,
      hasCapture,
      commandersToStore: this.beforeCommanders,
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
    return `${baseFEN} DEPLOY ${algebraic(
      this.stackSquare,
    )}:${movesStr}${unfinished}`
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
    // Commit and return completed result via game method
    const commitResult = game.commitSession()
    if (commitResult.success && commitResult.result) {
      return commitResult.result
    }
    // If commit failed (validation), return intermediate
    return session.createIntermediateResult()
  }

  // Return intermediate result (not complete yet)
  return session.createIntermediateResult()
}
