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
  PieceSymbol,
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
import { createError, ErrorCode } from '@cotulenh/common'
import type { CoTuLenh } from './cotulenh.js'

/**
 * Result of a move operation - unified for both standard and deploy moves
 */
export interface RecombineOption {
  square: Square // The square of the deployed piece we want to recombine with
  piece: PieceSymbol // The piece from the stack we are adding
}

export class MoveResult {
  private _san?: string
  private _lan?: string

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
  ) {}

  get isDeploy(): boolean {
    return this.flags.indexOf(FLAGS.DEPLOY) > -1
  }

  get isCapture(): boolean {
    return this.flags.indexOf(FLAGS.CAPTURE) > -1
  }

  get isStayCapture(): boolean {
    return this.flags.indexOf(FLAGS.STAY_CAPTURE) > -1
  }

  get isCombination(): boolean {
    return this.flags.indexOf(FLAGS.COMBINATION) > -1
  }

  get isSuicideCapture(): boolean {
    return this.flags.indexOf(FLAGS.SUICIDE_CAPTURE) > -1
  }

  get san(): string {
    if (!this._san) {
      throw new Error('SAN not set for this move result')
    }
    return this._san
  }

  get lan(): string {
    if (!this._lan) {
      throw new Error('LAN not set for this move result')
    }
    return this._lan
  }

  setSan(san: string): void {
    this._san = san
  }

  setLan(lan: string): void {
    this._lan = lan
  }

  hasNotation(): boolean {
    return !!this._san && !!this._lan
  }

  /**
   * Create MoveResult from already-executed move data (standard moves).
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
  }): MoveResult {
    // Flatten captured piece(s) to ensure consistent Piece[] type
    let captured: Piece[] | undefined
    if (data.captured) {
      captured = Array.isArray(data.captured)
        ? data.captured
        : flattenPiece(data.captured)
    }

    const result = new MoveResult(
      data.color,
      data.from,
      data.piece,
      data.flags,
      data.before,
      data.after,
      data.to, // to: Square
      captured,
      data.completed ?? true,
    )
    result.setSan(data.san)
    result.setLan(data.lan)
    return result
  }

  /**
   * Create MoveResult from deploy session data.
   */
  static fromDeploySession(data: {
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
  }): MoveResult {
    const result = new MoveResult(
      data.color,
      data.from,
      data.piece,
      data.flags,
      data.before,
      data.after,
      data.to, // to: Map<Square, Piece>
      data.captured,
      data.completed ?? true,
      data.stay,
    )
    result.setSan(data.san)
    result.setLan(data.lan)
    return result
  }

  /**
   * Create MoveResult from raw session data.
   */
  static createDeploy(
    game: CoTuLenh,
    moves: InternalMove[],
    remaining: Piece[],
    stackSquare: number,
    turn: Color,
    originalPiece: Piece,
    beforeFEN: string,
    completed: boolean,
  ): MoveResult {
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

    const { san, lan } = MoveResult.calculateDeploySanLan(
      moves,
      stackSquare,
      stay,
    )
    const flagsStr = MoveResult.calculateDeployFlags(moves)

    return MoveResult.fromDeploySession({
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

  /**
   * Creates a plan for a recombine operation.
   * Validates the option and returns the full list of moves to replay.
   */
  createReplayPlan(option: RecombineOption): InternalMove[] {
    // 1. Validate and get target index
    const { moveIndex, combinedPiece } = this.validateRecombine(option)

    // 2. Clone ALL moves before any mutation to prevent stale data issues
    const newMoves = this.moves.map((m) => ({
      ...m,
      piece: { ...m.piece },
      captured: m.captured ? { ...m.captured } : undefined,
      flags: m.flags | BITS.DEPLOY, // Ensure deploy flag
    }))

    // 3. Modify the target move with combined piece
    newMoves[moveIndex] = {
      ...newMoves[moveIndex],
      piece: combinedPiece,
    }

    return newMoves
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
    result: MoveResult
  } {
    const deployCommand = DeployMoveSequenceCommand.create(
      this._commands,
      this.moves,
    )
    const deployMove = MoveResult.createDeploy(
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
    result: MoveResult
  } {
    const command = this._commands[0]
    const move = command.move
    // Use cached legal moves from session start for disambiguation
    const [san, lan] =
      move.san && move.lan
        ? [move.san, move.lan]
        : moveToSanLan(move, this._game['_moves']({ legal: true }))
    const flagsStr = this._flagsFromMove(move)

    const moveObj = MoveResult.fromExecutedMove({
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
   * Get available Recombine options only.
   * This allows a piece remaining in the stack to "catch up" and combine
   * with a piece that was already deployed in this session.
   */
  getOptions(): RecombineOption[] {
    // Early exits: only available during deployment with moves and remaining pieces
    if (
      !this.isDeploy ||
      this._commands.length === 0 ||
      this.remaining.length === 0
    ) {
      return []
    }

    const options: RecombineOption[] = []

    // Part 1: Generate all possible combinations
    // ----------------------------------------
    for (const remainingPiece of this.remaining) {
      for (const move of this.moves) {
        const option: RecombineOption = {
          square: algebraic(move.to),
          piece: remainingPiece.type,
        }

        // Part 2: Validate candidates
        // ---------------------------
        try {
          // Delegate to existing validation logic
          this.validateRecombine(option)
          options.push(option)
        } catch {
          // Ignore invalid options
        }
      }
    }

    return options
  }

  /**
   * Validate that a recombine operation is possible and return data for execution.
   * Performs full validation including terrain and commander safety checks.
   * Throws if the recombine is invalid for any reason.
   * @returns moveIndex and combinedPiece for use by executeRecombine()
   */
  validateRecombine(option: RecombineOption): {
    moveIndex: number
    combinedPiece: Piece
  } {
    // Find target move index
    const moveIndex = this.moves.findIndex(
      (m) => algebraic(m.to) === option.square,
    )
    if (moveIndex === -1) {
      throw createError(
        ErrorCode.MOVE_INVALID_DESTINATION,
        `Invalid recombine target: No move found to square ${option.square}`,
      )
    }

    // Verify piece exists in remaining stack
    const stackPiece = this.remaining.find((p) => p.type === option.piece)
    if (!stackPiece) {
      throw createError(
        ErrorCode.MOVE_PIECE_NOT_FOUND,
        `Invalid recombine piece: ${option.piece} not found in remaining stack`,
      )
    }

    // Verify the pieces can actually combine
    const targetMove = this.moves[moveIndex]
    const combinedPiece = combinePieces([targetMove.piece, stackPiece])
    if (!combinedPiece) {
      throw createError(ErrorCode.COMBINATION_FAILED, 'Pieces cannot combine')
    }

    // Verify terrain validity for combined piece (mirrors getOptions check)
    if (!getMovementMask(combinedPiece.type)[targetMove.to]) {
      throw createError(
        ErrorCode.BOARD_INVALID_TERRAIN,
        `Combined piece cannot exist on square ${option.square}`,
      )
    }

    // Verify commander safety (mirrors getOptions check)
    const hasCommander =
      haveCommander(targetMove.piece) || haveCommander(stackPiece)
    if (hasCommander) {
      const attackers = this._game.getAttackers(
        targetMove.to,
        swapColor(this.turn),
        combinedPiece.type,
      )
      if (attackers.length > 0) {
        throw createError(
          ErrorCode.SESSION_INVALID_OPERATION,
          'Recombine would leave commander in danger',
        )
      }
    }

    return { moveIndex, combinedPiece }
  }

  /**
   * @deprecated Use validateRecombine() instead. Kept for backwards compatibility.
   */
  recombine(option: RecombineOption): void {
    this.validateRecombine(option)
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
  // 1. Ensure Session
  const session = MoveSession.ensure(game, move)

  // 2. Add move to session (executes immediately)
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
 * Execute a recombine operation safely.
 *
 * Strategy: Deep clone all move data upfront, cancel session, then replay
 * ALL moves with the target move modified to use the combined piece.
 *
 * @param game - The game instance with an active deploy session
 * @param option - The recombine option containing the square and piece to combine
 * @returns MoveResult when complete, or intermediate result if session needs more moves
 */
export function executeRecombine(
  game: CoTuLenh,
  option: RecombineOption,
): MoveResult {
  const session = game.getSession()

  if (!session || !session.isDeploy) {
    throw createError(
      ErrorCode.SESSION_INVALID_OPERATION,
      'No active deploy session for recombine',
    )
  }

  // 1. Get the plan (State calculation)
  const allMoves = session.createReplayPlan(option)

  // 2. Reset State (Execution)
  // Cancel session (undoes all moves on board, clears session from game)
  session.cancel()

  // 3. Replay (Execution)
  // Replay ALL moves in order
  let result: MoveResult | null | undefined
  for (let i = 0; i < allMoves.length; i++) {
    const moveResult = game.move(allMoves[i])

    // Update result for each step, but carefully handling the loop end
    result = moveResult
  }

  // Safety check: should never be undefined since we validated moves exist
  if (!result) {
    throw createError(
      ErrorCode.INTERNAL_INCONSISTENCY,
      'executeRecombine: No moves to replay',
    )
  }

  return result
}
