import {
  Color,
  Piece,
  InternalMove,
  BITS,
  algebraic,
  FLAGS,
  Square,
  PieceSymbol,
  getMovementMask,
} from './type.js'
import {
  flattenPiece,
  combinePieces,
  moveToSanLan,
  makeSanPiece,
} from './utils.js'
import {
  CTLMoveCommandInteface,
  CTLMoveSequenceCommandInterface,
  DeployMoveSequenceCommand,
  createMoveCommand,
  StateUpdateAction,
} from './move-apply.js'
import { createError, ErrorCode } from '@cotulenh/common'
import { CoTuLenh } from './cotulenh.js'

/**
 * Internal interface for recombine operations
 */
interface RecombineOption {
  square: Square // The square of the deployed piece we want to recombine with
  piece: PieceSymbol // The piece from the stack we are adding
}

/**
 * Readonly view of deploy session state for UI rendering.
 * Provides a safe, immutable interface to display deploy progress without
 * exposing internal session mechanics.
 */
export interface DeployStateView {
  readonly stackSquare: Square
  readonly turn: Color
  readonly originalPiece: Piece
  readonly movedPieces: Piece[]
  readonly remainingPieces: Piece[]
  readonly stayPiece: Piece | undefined
  readonly canCommit: boolean
  readonly isComplete: boolean
}

/**
 * Modify moves array to apply a recombine option to the target move.
 */
function applyRecombineToMoves(
  moves: InternalMove[],
  option: RecombineOption,
): InternalMove[] {
  const moveIndex = moves.findIndex((m) => algebraic(m.to) === option.square)
  if (moveIndex === -1) {
    throw createError(
      ErrorCode.MOVE_PIECE_NOT_FOUND,
      `No move found targeting square ${option.square}`,
    )
  }

  const targetMove = moves[moveIndex]
  const stackPiece: Piece = {
    type: option.piece,
    color: targetMove.piece.color,
  }

  const combinedPiece = combinePieces([targetMove.piece, stackPiece])
  if (!combinedPiece) {
    throw createError(
      ErrorCode.COMBINATION_FAILED,
      `Failed to combine ${targetMove.piece.type} with ${option.piece}`,
    )
  }

  const newMoves: InternalMove[] = structuredClone(moves)

  newMoves[moveIndex] = {
    ...newMoves[moveIndex],
    piece: combinedPiece,
    combined: combinedPiece,
  }

  return newMoves
}

/**
 * Try to replay moves on a game instance.
 * Returns true if all moves succeed.
 */
function replayMovesOnGame(game: CoTuLenh, moves: InternalMove[]): boolean {
  try {
    for (const move of moves) {
      if (!game.move(move)) return false
    }
    return true
  } catch {
    game.getSession()?.cancel()
    return false
  }
}

export class MoveResult {
  constructor(
    public readonly color: Color,
    public readonly from: Square,
    public readonly piece: Piece,
    public readonly flags: string,
    public readonly before: string,
    public readonly after: string,
    public readonly to: Square | Map<Square, Piece>,
    public readonly captured?: Piece[],
    public readonly completed: boolean = true,
    public readonly stay?: Piece,
    public readonly san: string = '',
    public readonly lan: string = '',
  ) {}

  get isDeploy(): boolean {
    return this.flags.includes(FLAGS.DEPLOY)
  }

  get isCapture(): boolean {
    return this.flags.includes(FLAGS.CAPTURE)
  }

  get isStayCapture(): boolean {
    return this.flags.includes(FLAGS.STAY_CAPTURE)
  }

  get isSuicideCapture(): boolean {
    return this.flags.includes(FLAGS.SUICIDE_CAPTURE)
  }

  /**
   * Get move squares for highlighting (from → to).
   * For deploy moves, returns all deployed squares.
   * For normal moves, returns [from, to].
   */
  getHighlightSquares(): Square[] {
    if (this.isDeploy && this.to instanceof Map) {
      const squares = [this.from]
      squares.push(...this.to.keys())
      return squares
    }
    return [this.from, this.to as Square]
  }

  /**
   * Universal factory for MoveResult
   */
  static create(data: {
    color: Color
    from: Square
    to: Square | Map<Square, Piece>
    piece: Piece
    flags: string
    before: string
    after: string
    san: string
    lan: string
    captured?: Piece | Piece[]
    stay?: Piece
    completed?: boolean
  }): MoveResult {
    let captured: Piece[] | undefined
    if (data.captured) {
      captured = Array.isArray(data.captured)
        ? data.captured
        : flattenPiece(data.captured)
    }

    return new MoveResult(
      data.color,
      data.from,
      data.piece,
      data.flags,
      data.before,
      data.after,
      data.to,
      captured,
      data.completed ?? true,
      data.stay,
      data.san,
      data.lan,
    )
  }

  static calculateDeploySanLan(
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
    const sanStay = stay ? `${makeSanPiece(stay)}<` : ''
    const san = `${sanStay}${movesSan}`

    // LAN (FEN part): Origin:Stay:Moves
    const lan = `${algebraic(stackSquare)}:${stayNotation}:${movesSan}`
    return { san, lan }
  }

  static calculateDeployFlags(moves: InternalMove[]): string {
    const set = new Set<string>()
    for (const m of moves) {
      set.add(MoveResult.flagsToString(m.flags))
    }
    // Flatten individual flag strings into unique characters
    const allFlags = new Set<string>()
    for (const flagStr of set) {
      for (const char of flagStr) {
        allFlags.add(char)
      }
    }
    // ensureDeploy=true logic: 'd' appears first and no duplicates
    const parts = Array.from(allFlags).filter((f) => f !== FLAGS.DEPLOY)
    return FLAGS.DEPLOY + parts.join('')
  }

  /** Convert a flags bitmask to a string */
  static flagsToString(flags: number): string {
    let out = ''
    for (const flag in BITS) {
      if (BITS[flag] & flags) out += FLAGS[flag]
    }
    return out
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
  private readonly _beforeMoves: InternalMove[] // Legal moves at session start for SAN disambiguation
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

  /**
   * Static factory to ensure a session exists for the given move.
   * If a session exists, it returns it.
   * If not, it validates the move start and creates a new session.
   */
  static ensure(game: CoTuLenh, move: InternalMove): MoveSession {
    const existing = game.getSession()
    if (existing) return existing

    const stackSquare = move.from
    const originalPiece = game.get(stackSquare)

    if (!originalPiece) {
      throw createError(
        ErrorCode.MOVE_NO_PIECE_TO_MOVE,
        `No piece at ${algebraic(stackSquare)} to start move session`,
      )
    }

    const session = new MoveSession(game, {
      stackSquare,
      turn: game.turn(),
      originalPiece: structuredClone(originalPiece),
      isDeploy: (move.flags & BITS.DEPLOY) !== 0,
    })
    game.setSession(session)
    return session
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
    // Capture legal moves before any moves (for SAN disambiguation)
    this._beforeMoves = game['_moves']({ legal: true })
  }

  get startFEN(): string {
    return this._beforeFEN
  }

  /**
   * Add an InternalMove to the session.
   * Detects recombine moves and handles them by replaying with combined piece.
   * Converts to command and executes immediately.
   */
  addMove(move: InternalMove): void {
    // Check if this is a recombine move (remaining piece targeting a deployed square)
    if (this.isDeploy && !this.isEmpty) {
      const targetSquare = algebraic(move.to)
      const pieceType = move.piece.type

      if (this.isRecombineTarget(targetSquare, pieceType)) {
        this._executeRecombine({ square: targetSquare, piece: pieceType })
        return
      }
    }

    const command = createMoveCommand(this._game, move)
    command.execute()
    this._commands.push(command)
    this._game['_movesCache'].clear()
  }

  /**
   * Execute a recombine: cancel current moves, replay with combined piece.
   * Uses game.move() to properly create a new session via MoveSession.ensure().
   * @private
   */
  private _executeRecombine(option: RecombineOption): void {
    const moves = [...this.moves]
    const game = this._game
    this.cancel()

    try {
      const modifiedMoves = applyRecombineToMoves(moves, option)

      // Replay through game.move() which creates a new session via MoveSession.ensure()
      for (const modMove of modifiedMoves) {
        const result = game.move(modMove)
        if (!result) {
          // If replay fails, cancel and restore original moves
          game.getSession()?.cancel()
          for (const origMove of moves) {
            game.move(origMove)
          }
          return
        }
      }
    } catch {
      // If recombine fails, restore original moves
      game.getSession()?.cancel()
      for (const origMove of moves) {
        game.move(origMove)
      }
    }
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
    result: MoveResult
  } {
    // For completed deploys, exclude deploy state from FEN (pass false)
    // For incomplete deploys, include the deploy state in FEN (pass true)
    const afterFEN = this._game.fen(!completed)
    const remaining = this.remaining
    const stay =
      remaining.length > 0 ? (combinePieces(remaining) ?? undefined) : undefined

    const captured: Piece[] = []
    for (const move of this.moves) {
      if (move.captured) captured.push(move.captured)
    }

    const toMap = new Map<string, Piece>()
    for (const move of this.moves) {
      toMap.set(algebraic(move.to), move.piece)
    }

    const { san, lan } = MoveResult.calculateDeploySanLan(
      this.moves,
      this.stackSquare,
      stay,
    )
    const flagsStr = MoveResult.calculateDeployFlags(this.moves)

    const deployCommand = DeployMoveSequenceCommand.create(
      this._commands,
      this.moves,
    )
    const deployMove = MoveResult.create({
      color: this.turn,
      from: algebraic(this.stackSquare),
      to: toMap,
      piece: this.originalPiece,
      stay,
      captured: captured.length > 0 ? captured : undefined,
      flags: flagsStr,
      before: this._beforeFEN,
      after: afterFEN,
      san,
      lan,
      completed,
    })

    return { command: deployCommand, result: deployMove }
  }

  /**
   * Generate commit data for standard moves
   * @private
   */
  private _generateStandardCommitData(completed: boolean): {
    command: CTLMoveCommandInteface
    result: MoveResult
  } {
    const command = this._commands[0]
    const move = command.move
    const [san, lan] = moveToSanLan(move, this._beforeMoves)
    const flagsStr = this._flagsFromMove(move)

    const moveObj = MoveResult.create({
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
      throw createError(
        ErrorCode.SESSION_INVALID_OPERATION,
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

    const { lan } = MoveResult.calculateDeploySanLan(
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
   * Check if a move to target square with given piece type is a recombine attempt.
   * Returns true if the target is a deployed square and piece is a cargo piece (not the carrier).
   */
  isRecombineTarget(targetSquare: Square, pieceType: PieceSymbol): boolean {
    if (!this.isDeploy || this.isEmpty) return false

    // Carrier moving is not a recombine - it's completing the deploy
    if (pieceType === this.originalPiece.type) return false

    const isDeployedSquare = this.moves.some(
      (m) => algebraic(m.to) === targetSquare,
    )
    const isRemainingPiece = this.remaining.some((p) => p.type === pieceType)

    return isDeployedSquare && isRemainingPiece
  }

  /**
   * Get valid recombine options as RecombineOption[].
   * Validates terrain, combination rules, and replays on a test game to ensure validity.
   */
  getRecombineOptions(): RecombineOption[] {
    if (!this.isDeploy || this.isEmpty) return []

    const remaining = this.remaining
    const sessionMoves = this.moves

    if (remaining.length === 0 || sessionMoves.length === 0) return []

    const validOptions: RecombineOption[] = []
    const startFEN = this.startFEN
    const moves = [...sessionMoves]

    for (const remainingPiece of remaining) {
      for (const move of sessionMoves) {
        const combinedPiece = combinePieces([move.piece, remainingPiece])
        if (!combinedPiece) continue

        const terrainMask = getMovementMask(combinedPiece.type)
        if (!terrainMask[move.to]) continue

        const option: RecombineOption = {
          square: algebraic(move.to),
          piece: remainingPiece.type,
        }

        // Validate by replaying modified moves on a fresh game
        try {
          const modifiedMoves = applyRecombineToMoves(moves, option)
          const testGame = new CoTuLenh(startFEN)
          if (replayMovesOnGame(testGame, modifiedMoves)) {
            validOptions.push(option)
          }
        } catch {
          // Invalid combination, skip
        }
      }
    }

    return validOptions
  }

  /**
   * Generate recombine moves as InternalMove[] for move generation.
   * These moves allow remaining pieces to target deployed squares for recombination.
   * @param filterPiece - Optional piece type filter
   */
  generateRecombineMoves(filterPiece?: PieceSymbol): InternalMove[] {
    const options = this.getRecombineOptions()
    if (options.length === 0) return []

    const moves: InternalMove[] = []

    for (const option of options) {
      if (filterPiece && option.piece !== filterPiece) continue

      const remainingPiece = this.remaining.find((p) => p.type === option.piece)
      if (!remainingPiece) continue

      const deployedMove = this.moves.find(
        (m) => algebraic(m.to) === option.square,
      )
      if (!deployedMove) continue

      // Calculate combined piece for the recombine
      const combinedPiece = combinePieces([deployedMove.piece, remainingPiece])

      moves.push({
        color: this.turn,
        from: this.stackSquare,
        to: deployedMove.to,
        piece: remainingPiece,
        flags: BITS.DEPLOY | BITS.COMBINATION,
        combined: combinedPiece ?? undefined,
      })
    }

    return moves
  }

  /**
   * Get a readonly view of deploy state for UI rendering.
   * Returns null for non-deploy sessions.
   *
   * This method provides a safe interface for UI components to access deploy
   * state without exposing internal session mechanics or allowing mutations.
   */
  getDeployView(): DeployStateView | null {
    if (!this.isDeploy) return null

    return {
      stackSquare: algebraic(this.stackSquare),
      turn: this.turn,
      originalPiece: this.originalPiece,
      movedPieces: this.moves.flatMap((m) => flattenPiece(m.piece)),
      remainingPieces: this.remaining,
      stayPiece:
        this.remaining.length > 0
          ? (combinePieces(this.remaining) ?? undefined)
          : undefined,
      canCommit: this.canCommit(),
      isComplete: this.isComplete,
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
  // Note: Auto-recombine detection is handled in CoTuLenh.move() before validation
  // Ensure Session
  const session = MoveSession.ensure(game, move)

  // 2. Add move to session (executes immediately on board)
  session.addMove(move)

  // 3. Check if complete and should auto-commit
  if (session.isComplete && autoCommit) {
    // Commit and return completed result via game method
    const commitResult = game.commitSession()
    if (commitResult.success && commitResult.result) {
      return commitResult.result
    }
  }

  // Return intermediate result (not complete yet) or fallthrough from failed commit
  return session.getCurrentResult()
}

/**
 * Result of a recombine operation (internal)
 */
interface RecombineResult {
  success: boolean
  result?: MoveResult
}

/**
 * Apply a recombine option to the current game session.
 * Cancels current session and replays moves with the recombined piece.
 * Returns the MoveResult so the caller can update UI and decide when to commit.
 */
export function tryRecombine(
  game: CoTuLenh,
  option: { square: Square; piece: PieceSymbol },
): RecombineResult {
  const session = game.getSession()
  if (!session) {
    return { success: false }
  }

  const moves = [...session.moves]
  session.cancel()

  try {
    const modifiedMoves = applyRecombineToMoves(moves, option)

    // Replay all moves - no auto-commit, session stays open
    let lastResult: MoveResult | null = null
    for (const move of modifiedMoves) {
      lastResult = game.move(move)
      if (!lastResult) {
        game.getSession()?.cancel()
        return { success: false }
      }
    }

    // Return the current session state
    const currentSession = game.getSession()
    if (currentSession) {
      return { success: true, result: currentSession.getCurrentResult() }
    }

    return { success: true, result: lastResult ?? undefined }
  } catch {
    game.getSession()?.cancel()
    return { success: false }
  }
}
