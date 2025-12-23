import {
  Color,
  Piece,
  InternalMove,
  BITS,
  algebraic,
  FLAGS,
  Square,
  swapColor,
  getMovementMask,
} from './type.js'
import {
  flattenPiece,
  combinePieces,
  moveToSanLan,
  makeSanPiece,
  haveCommander,
} from './utils.js'
import {
  CTLMoveCommandInteface,
  CTLMoveSequenceCommandInterface,
  DeployMoveSequenceCommand,
  createMoveCommand,
  StateUpdateAction,
} from './move-apply.js'
import type { CoTuLenh } from './cotulenh.js'

/**
 * Result of a move operation
 * Indicates whether the move sequence is complete and provides the move object
 */
export type MoveResult = StandardMove | DeploySequence

export interface BaseMoveResult {
  color: Color
  from: Square
  piece: Piece
  captured?: Piece[]
  san?: string
  lan?: string
  before: string
  after: string
  completed: boolean
  isDeploy: boolean
}

export interface RecombineOption {
  square: Square // The square of the deployed piece we want to recombine with
  piece: Piece // The piece from the stack we are adding
}

// Public StandardMove class (formerly Move)
export class StandardMove implements BaseMoveResult {
  color!: Color
  from!: Square
  to!: Square // Destination square (piece's final location)
  piece!: Piece
  captured?: Piece[]
  flags!: string // String representation of flags
  san?: string // Standard Algebraic Notation (needs implementation)
  lan?: string // Long Algebraic Notation (needs implementation)
  before!: string // FEN before move
  after!: string // FEN after move
  completed: boolean = true // Default to true for normal moves
  isDeploy: boolean = false

  // Old constructor removed - use StandardMove.fromExecutedMove() instead

  /**
   * Create StandardMove from already-executed move data (preferred for deploy session moves).
   * No game state manipulation required - all data provided directly.
   *
   * @param data - Complete move data
   * @returns StandardMove instance
   */
  static fromExecutedMove(data: {
    color: Color
    from: Square
    to: Square
    piece: Piece
    captured?: Piece | Piece[]
    flags: string
    before: string
    after: string
    san: string
    lan: string
    completed?: boolean
  }): StandardMove {
    const move = Object.create(StandardMove.prototype)
    // console.log('StandardMove created:', move, 'Prototype:', Object.getPrototypeOf(move), 'Has method:', typeof move.isSuicideCapture)
    move.color = data.color
    move.from = data.from
    move.to = data.to
    move.piece = data.piece
    // Flatten captured piece(s) to ensure consistent Piece[] type
    if (data.captured) {
      move.captured = Array.isArray(data.captured)
        ? data.captured
        : flattenPiece(data.captured)
    } else {
      move.captured = undefined
    }
    move.flags = data.flags
    move.before = data.before
    move.after = data.after
    move.san = data.san
    move.lan = data.lan
    move.completed = data.completed ?? true
    move.isDeploy = move.flags.includes(FLAGS.DEPLOY)
    return move
  }

  // Add helper methods like isCapture(), isPromotion() etc. if needed
  isCapture(): boolean {
    return this.flags.indexOf(FLAGS.CAPTURE) > -1
  }

  isStayCapture(): boolean {
    return this.flags.indexOf(FLAGS.STAY_CAPTURE) > -1
  }

  // isDeploy(): boolean { return false } // Removed, use property instead

  isCombination(): boolean {
    return this.flags.indexOf(FLAGS.COMBINATION) > -1
  }

  isSuicideCapture(): boolean {
    return this.flags.indexOf(FLAGS.SUICIDE_CAPTURE) > -1
  }
}

// Public DeploySequence class (formerly DeployMove)
export class DeploySequence implements BaseMoveResult {
  color!: Color
  from!: Square
  to!: Map<Square, Piece> // Destination square (piece's final location)
  piece!: Piece // The main piece being deployed
  stay: Piece | undefined
  captured?: Piece[]
  flags!: string // String representation of flags (e.g., 'd' for deploy, 'c' for capture)
  san?: string // Standard Algebraic Notation (needs implementation)
  lan?: string // Long Algebraic Notation (needs implementation)
  before!: string // FEN before move
  after!: string // FEN after move
  completed: boolean = true
  isDeploy = true as const

  /**
   * Create DeploySequence from session data (preferred method).
   * No game state manipulation required - all data provided by session.
   *
   * @param data - Complete move data from DeploySession
   * @returns DeploySequence instance
   */
  static fromSession(data: {
    color: Color
    from: Square
    to: Map<Square, Piece>
    piece: Piece
    stay?: Piece
    captured?: Piece[]
    flags: string
    before: string
    after: string
    san: string
    lan: string
    completed?: boolean
  }): DeploySequence {
    const move = Object.create(DeploySequence.prototype)
    move.color = data.color
    move.from = data.from
    move.to = data.to
    move.piece = data.piece
    move.stay = data.stay
    move.captured = data.captured
    move.flags = data.flags
    move.before = data.before
    move.after = data.after
    move.san = data.san
    move.lan = data.lan
    move.completed = data.completed ?? true
    move.isDeploy = true
    return move
  }

  /**
   * Create DeploySequence from raw session data.
   * Centralizes the logic for creating the DeploySequence result object.
   */
  static create(
    game: CoTuLenh,
    moves: InternalMove[],
    remaining: Piece[],
    stackSquare: number,
    turn: Color,
    originalPiece: Piece,
    beforeFEN: string,
    completed: boolean,
  ): DeploySequence {
    const afterFEN = game.fen(!completed)
    const stay =
      remaining.length > 0 ? (combinePieces(remaining) ?? undefined) : undefined

    const captured: Piece[] = []
    for (const move of moves) {
      if (move.captured) captured.push(move.captured)
    }

    const toMap = new Map<string, Piece>()
    for (const move of moves) {
      toMap.set(algebraic(move.to), move.piece)
    }

    const { san, lan } = DeploySequence.calculateSanLan(
      moves,
      stackSquare,
      stay,
    )
    const flagsStr = DeploySequence.calculateFlags(moves)

    return DeploySequence.fromSession({
      color: turn,
      from: algebraic(stackSquare),
      to: toMap,
      piece: originalPiece,
      stay: stay ?? undefined,
      captured: captured.length > 0 ? captured : undefined,
      flags: flagsStr,
      before: beforeFEN,
      after: afterFEN,
      san,
      lan,
      completed,
    })
  }

  public static calculateSanLan(
    moves: InternalMove[],
    stackSquare: number,
    stay: Piece | undefined,
  ): { san: string; lan: string } {
    // In deploy sessions, only pieces from the same stack can move
    const allMoveSan = moves.map((m: InternalMove) => {
      // Use moveToSanLan to get consistent "Piece>Dest" format
      return moveToSanLan(m)[0]
    })
    const movesSan = allMoveSan.join(',')
    const stayNotation = stay ? makeSanPiece(stay) : ''

    // SAN: Simple representation "Stay< Move1, Move2"
    // This is for UI/Logging, not critical for FEN persistence but good for readability
    const sanStay = stay ? `${makeSanPiece(stay)}<` : ''
    const san = `${sanStay}${movesSan}`

    // LAN (FEN part): Origin:Stay:Moves
    // Example: a1:K(P):N>a2,P>a3
    const lan = `${algebraic(stackSquare)}:${stayNotation}:${movesSan}`
    return { san, lan }
  }

  private static calculateFlags(moves: InternalMove[]): string {
    const set = new Set<string>()
    for (const m of moves) {
      for (const flag in BITS) {
        if (BITS[flag] & m.flags) set.add(FLAGS[flag])
      }
    }
    // ensureDeploy=true logic: 'd' appears first and no duplicates
    const parts = Array.from(set).filter((f) => f !== FLAGS.DEPLOY)
    return FLAGS.DEPLOY + parts.join('')
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
  private readonly _game: CoTuLenh
  private readonly _beforeFEN: string
  private readonly _commands: CTLMoveCommandInteface[] = []

  // === Small helpers to avoid duplication ===
  /** Build flag string for a single move */
  private _flagsFromMove(move: InternalMove): string {
    let out = ''
    for (const flag in BITS) {
      if (BITS[flag] & move.flags) out += FLAGS[flag]
    }
    return out
  }

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

    if (this.isEmpty) {
      this._game.setSession(null)
    }

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
   * Check if deployment is complete (all pieces deployed or no valid moves left)
   */
  get isComplete(): boolean {
    if (!this.isDeploy) return this._commands.length > 0
    if (this.remaining.length === 0) return true

    // Check if any remaining piece has a valid move using high-level game.moves
    // This utilizes the standard move generation and legal checks (filtered by game.moves)
    const moves = this._game.moves({
      square: algebraic(this.stackSquare),
      verbose: false, // We only need to know if count > 0
    })

    // If no moves are possible from this stack, we are complete (stuck or done)
    return moves.length === 0
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
   * Generates move result data.
   * @param completed - Whether this is a completed move (true) or intermediate state (false)
   * @private
   */
  private _generateCommitData(completed: boolean): {
    command: CTLMoveCommandInteface | CTLMoveSequenceCommandInterface
    result: MoveResult
  }
  private _generateCommitData(completed: false): {
    command: undefined
    result: MoveResult
  }
  private _generateCommitData(completed: boolean = true): {
    command?: CTLMoveCommandInteface | CTLMoveSequenceCommandInterface
    result: MoveResult
  } {
    if (this.isDeploy) {
      return this._generateDeployCommitData(completed)
    } else {
      return this._generateStandardCommitData(completed)
    }
  }

  /**
   * Generate commit data for deploy moves
   * @private
   */
  private _generateDeployCommitData(completed: boolean): {
    command: CTLMoveSequenceCommandInterface
    result: DeploySequence
  } {
    const deployCommand = DeployMoveSequenceCommand.create(
      this._commands,
      this.moves,
    )
    const deployMove = DeploySequence.create(
      this._game,
      this.moves,
      this.remaining,
      this.stackSquare,
      this.turn,
      this.originalPiece,
      this._beforeFEN,
      completed,
    )

    return { command: deployCommand, result: deployMove }
  }

  /**
   * Generate commit data for standard moves
   * @private
   */
  private _generateStandardCommitData(completed: boolean): {
    command: CTLMoveCommandInteface
    result: StandardMove
  } {
    const command = this._commands[0]
    const move = command.move
    // Use cached legal moves from session start for disambiguation
    const [san, lan] =
      move.san && move.lan
        ? [move.san, move.lan]
        : moveToSanLan(move, this._game['_moves']({ legal: true }))
    const flagsStr = this._flagsFromMove(move)

    const moveObj = StandardMove.fromExecutedMove({
      color: move.color,
      from: algebraic(move.from),
      to: algebraic(move.to),
      piece: move.piece,
      captured: move.captured,
      flags: flagsStr,
      before: this._beforeFEN,
      after: this._game.fen(),
      san,
      lan,
      completed,
    })

    return { command, result: moveObj }
  }

  /**
   * Get the current state of the session as a MoveResult.
   * This is for intermediate states (not yet committed).
   * @returns MoveResult with completed=false
   */
  getCurrentResult(): MoveResult {
    return this._generateCommitData(false).result
  }

  /**
   * Checks if the session can be safely committed.
   * Returns true if the move sequence is valid and does not leave the commander in danger.
   */
  canCommit(): boolean {
    const game = this._game
    const us = this.turn

    // Check valid terrain for remaining stack
    // This prevents scenarios where a carrier (e.g., NAVY) moves off a water square,
    // leaving behind passengers (e.g., LAND pieces) that cannot exist on water.
    if (this.isDeploy) {
      const remainingPiece = game.get(this.stackSquare)
      if (remainingPiece) {
        const mask = getMovementMask(remainingPiece.type)
        if (!mask[this.stackSquare]) {
          return false
        }
      }
    }

    // DELAYED VALIDATION: Check commander safety after all moves
    // This allows deploy sequences to escape check
    return !game.isCommanderInDanger(us)
  }

  /**
   * Commits the session: validates and generates final commit data.
   * Does NOT modify game state (history, turn, etc).
   * @returns Data needed for the game to apply the commit.
   * @throws An error if the move is invalid (e.g., leaves the commander in check).
   */
  commit(): {
    command: CTLMoveCommandInteface | CTLMoveSequenceCommandInterface
    result: MoveResult
    hasCapture: boolean
  } {
    const game = this._game

    if (!this.canCommit()) {
      throw new Error(
        'Move sequence does not escape check. Commander still in danger.',
      )
    }

    // 1. Create and Execute StateUpdateAction to update turn/counters BEFORE FEN generation
    const firstMove = this.moves[0]
    const stateAction = new StateUpdateAction(game, firstMove, undefined)
    stateAction.execute() // This now calculates the FEN internally with the right state

    // 2. Generate commit data (command and result object) with the correct FEN
    const { command, result } = this._generateCommitData(true)

    // 3. Check if any capture (check all moves in session)
    const hasCapture = this.moves.some((m) => !!(m.flags & BITS.CAPTURE))

    // 4. Attach the already-executed state action for undo purposes
    command.addPostAction(stateAction) // Will undo AFTER board undo

    return {
      command,
      result,
      hasCapture,
    }
  }

  /**
   * Generates the FEN string for the current deploy session
   */
  toFenString(): string {
    if (!this.isDeploy) return this._beforeFEN

    const { lan } = DeploySequence.calculateSanLan(
      this.moves,
      this.stackSquare,
      this.remaining.length > 0
        ? (combinePieces(this.remaining) ?? undefined)
        : undefined,
    )

    // Append lan which now contains the full logic
    // Use remaining count to decide on "..."
    const unfinished = this.remaining.length > 0 ? '...' : ''
    return `${this._beforeFEN} ${lan}${unfinished}`
  }

  /**
   * Get available Recombine options only.
   * This allows a piece remaining in the stack to "catch up" and combine
   * with a piece that was already deployed in this session.
   */
  getOptions(): RecombineOption[] {
    // Only available during deployment
    if (!this.isDeploy) return []
    // Need at least one move to recombine with
    if (this._commands.length === 0) return []
    // Need pieces remaining to be used for recombination
    if (this.remaining.length === 0) return []

    const remaining = this.remaining
    const moves = this.moves
    const options: RecombineOption[] = []
    const game = this._game
    const us = this.turn

    // Pre-compute data for each move (one-time per move, not per remaining piece)
    const moveData = moves.map((move) => ({
      move,
      square: algebraic(move.to),
      hasCommander: haveCommander(move.piece),
    }))

    for (const remainingPiece of remaining) {
      const remainingHasCommander = haveCommander(remainingPiece)

      for (const { move, square, hasCommander: moveHasCommander } of moveData) {
        // 1. Attempt combination logic
        const combined = combinePieces([move.piece, remainingPiece])
        if (!combined) continue

        // 2. Strict Terrain Validation for the NEW carrier
        const combinedMask = getMovementMask(combined.type)
        if (!combinedMask[move.to]) {
          continue
        }

        // 3. Commander Safety Check (OPTIMIZED)
        // Only do expensive board manipulation if commander is involved
        if (remainingHasCommander || moveHasCommander) {
          // Check if the new combined piece would be under attack
          // We pass the combined.type as assumeTargetType so getAttackers knows if it's hitting LAND or NAVY
          const isAttacked = game.getAttackers(
            move.to,
            swapColor(us),
            combined.type,
          )

          if (isAttacked.length > 0) {
            continue
          }
        }

        options.push({
          square,
          piece: remainingPiece,
        })
      }
    }

    return options
  }

  /**
   * Execute a Recombine option.
   * Modifies the session history to include the recombining piece in an earlier move.
   */
  recombine(option: RecombineOption): void {
    const moveIndex = this.moves.findIndex(
      (m) => algebraic(m.to) === option.square,
    )

    if (moveIndex === -1) {
      throw new Error(
        `Invalid recombine target: No move found to square ${option.square}`,
      )
    }

    // Verify piece is actually in remaining
    const remaining = this.remaining
    const pieceIndex = remaining.findIndex((p) => p.type === option.piece.type)
    if (pieceIndex === -1) {
      throw new Error(
        `Invalid recombine piece: ${option.piece.type} not found in remaining stack`,
      )
    }

    // Store the moves we are about to undo (in reverse order, so we can re-apply them correctly)
    const movesToReplay: InternalMove[] = []

    // Commands to undo: from End down to moveIndex
    // We undo them and collect the moves to replay (EXCEPT the updated one, which we reconstruct)
    // Note: undoLastMove() pops from _commands.
    const initialCommandCount = this._commands.length
    const commandsToUndo = initialCommandCount - moveIndex

    for (let i = 0; i < commandsToUndo; i++) {
      // undoLastMove pops the command and undoes it
      const undoneMove = this.undoLastMove()
      if (undoneMove) {
        movesToReplay.unshift(undoneMove) // Add to front to keep original order [Target, Next, Next...]
      }
    }

    // Now movesToReplay has [TargetMove, SubsequentMove1, SubsequentMove2...]
    // And board state is reverted to BEFORE TargetMove.

    const targetMove = movesToReplay[0]
    const subsequentMoves = movesToReplay.slice(1)

    // Modify Target Move
    const combinedPiece = combinePieces([targetMove.piece, option.piece])
    if (!combinedPiece) {
      throw new Error('Failed to combine pieces during recombine execution')
    }

    // Construct the new modified move
    // We must ensure the 'piece' property is updated. we reuse other properties.
    const modifiedTargetMove: InternalMove = {
      ...targetMove,
      piece: combinedPiece,
    }

    // Execute Modified Target Move
    this.addMove(modifiedTargetMove)

    // Re-execute Subsequent Moves
    // Strictly re-apply.
    for (const subMove of subsequentMoves) {
      this.addMove(subMove)
    }
  }
}

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
    return session.getCurrentResult()
  }

  // Return intermediate result (not complete yet)
  return session.getCurrentResult()
}
