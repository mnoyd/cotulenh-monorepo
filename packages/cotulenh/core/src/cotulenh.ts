/**
 * @license
 * Adapted from chess.js by Jeff Hlywa (jhlywa@gmail.com)
 * Copyright (c) 2024, Hoang Manh/cotulenh.js
 * All rights reserved.
 */

import QuickLRU from 'quick-lru'
import {
  algebraic,
  BITS,
  BLUE,
  Color,
  DEFAULT_POSITION,
  FLAGS,
  Piece,
  PieceSymbol,
  RED,
  Square,
  SQUARE_MAP,
  isDigit,
  swapColor,
  InternalMove,
  NAVY,
  NAVY_MASK,
  LAND_MASK,
  isSquareOnBoard,
  file,
  AirDefenseInfluence,
  AirDefense,
  AIR_FORCE,
  COMMANDER,
  VALID_SQUARES,
  rank,
} from './type.js'
import {
  printBoard,
  validateFen,
  makeSanPiece,
  combinePieces,
  strippedSan,
  inferPieceType,
  flattenPiece,
  haveCommander,
  moveToSanLan,
  extractPieces,
} from './utils.js'
import {
  generateMoves,
  ORTHOGONAL_OFFSETS,
  ALL_OFFSETS,
  DIAGONAL_OFFSETS,
  getPieceMovementConfig,
  getOppositeOffset,
  getCommanderExposureConstraints,
} from './move-generation.js'
import {
  createMoveCommand,
  CTLMoveCommandInteface,
  CTLMoveSequenceCommandInterface,
} from './move-apply.js'
import {
  BASE_AIRDEFENSE_CONFIG,
  getAirDefenseInfluence,
  getCheckAirDefenseZone,
  updateAirDefensePiecesPosition,
} from './air-defense.js'
import {
  MoveSession,
  handleMove,
  executeRecombine,
  StandardMove,
  DeploySequence,
  type MoveResult,
  type RecombineOption,
} from './move-session.js'
import { createError, ErrorCode, logger } from '@cotulenh/common'

export { StandardMove, DeploySequence, type MoveResult, type RecombineOption }

// Structure for storing history states
interface History {
  command: CTLMoveCommandInteface | CTLMoveSequenceCommandInterface
}

// Public Move class moved to move-session.ts

// --- CoTuLenh Class (Additions) ---
export class CoTuLenh {
  private _movesCache = new QuickLRU<string, InternalMove[]>({ maxSize: 1000 })
  private _board = new Array<Piece | undefined>(256)
  private _turn: Color = RED // Default to Red
  private _header: Record<string, string> = {}
  private _commanders: Record<Color, number> = { r: -1, b: -1 } // Commander positions
  private _halfMoves = 0
  private _moveNumber = 1
  private _history: History[] = []
  private _comments: Record<string, string> = {}
  private _positionCount: Record<string, number> = {}
  private _session: MoveSession | null = null // Tracks active move session
  private _airDefense: AirDefense = {
    [RED]: new Map<number, number[]>(),
    [BLUE]: new Map<number, number[]>(),
  }

  constructor(fen = DEFAULT_POSITION) {
    this.load(fen)
  }

  /**
   * Clears the board by removing all pieces and resetting the game state to initial conditions.
   * This includes resetting the turn, move counters, position counts, and command history.
   * @param options - Clear options
   * @param options.preserveHeaders - Whether to preserve existing headers
   */
  clear({ preserveHeaders = false } = {}) {
    this._movesCache.clear()
    this._board = new Array<Piece | undefined>(256)
    this._commanders = { r: -1, b: -1 }
    this._turn = RED
    this._halfMoves = 0
    this._moveNumber = 1
    this._history = []
    this._comments = {}
    this._header = preserveHeaders ? this._header : {}
    this._positionCount = {}
    this._airDefense = {
      [RED]: new Map<number, number[]>(),
      [BLUE]: new Map<number, number[]>(),
    }
    delete this._header['SetUp']
    delete this._header['FEN']
    this._session = null
  }

  /**
   * Loads a chess position from a FEN (Forsyth-Edwards Notation) string.
   * Parses and validates the FEN string, then sets up the board state accordingly.
   * @param fen - The FEN string representing the position to load
   * @param options - Loading options
   * @param options.skipValidation - Whether to skip FEN validation
   * @param options.preserveHeaders - Whether to preserve existing headers
   * @throws Error if the FEN string is invalid
   */
  load(fen: string, { skipValidation = false, preserveHeaders = false } = {}) {
    this._movesCache.clear()
    // Parse FEN string into tokens
    const tokens = fen.split(/\s+/)
    const position = tokens[0]

    this.clear({ preserveHeaders })

    // Validate FEN format if not skipping validation
    if (!skipValidation) {
      // validateFen(fen)
    }

    // Parse board position
    const ranks = position.split('/')
    if (ranks.length !== 12) {
      const msg = `Invalid FEN: expected 12 ranks, got ${ranks.length}`
      throw createError(ErrorCode.FEN_INVALID_RANK_COUNT, msg, {
        expected: 12,
        actual: ranks.length,
      })
    }
    let parsingStack = false
    let nextHeroic = false
    for (let r = 0; r < 12; r++) {
      let col = 0
      for (let i = 0; i < ranks[r].length; i++) {
        const char = ranks[r].charAt(i)
        if (isDigit(char)) {
          let num = char
          // Max rank width is 11, so we only need to check for a 2nd digit if the first is '1'
          if (
            char === '1' &&
            i + 1 < ranks[r].length &&
            isDigit(ranks[r].charAt(i + 1))
          ) {
            num += ranks[r].charAt(++i)
          }
          col += parseInt(num, 10)
          if (col > 11) {
            const msg = `Invalid FEN: rank ${12 - r} has too many squares (${ranks[r]})`
            throw createError(ErrorCode.FEN_INVALID_FILE_COUNT, msg, {
              rankIndex: 12 - r,
              rankContent: ranks[r],
            })
          }
        } else if (char === '+') {
          nextHeroic = true
        } else if (char === '(') {
          parsingStack = true
        } else if (char === ')') {
          if (parsingStack === false) {
            throw createError(
              ErrorCode.FEN_MISMATCH_PARENTHESES,
              `Invalid FEN: ) without matching ( in rank ${12 - r}`,
              { rankIndex: 12 - r },
            )
          }
          parsingStack = false
          col++
        } else {
          const color = char < 'a' ? RED : BLUE
          const piece = {
            type: char.toLowerCase() as PieceSymbol,
            color,
            heroic: nextHeroic,
          } as Piece
          this.put(piece, algebraic(r * 16 + col), true)
          if (!parsingStack) {
            col++
          }
          nextHeroic = false
        }
      }
      if (parsingStack) {
        throw createError(
          ErrorCode.FEN_MISMATCH_PARENTHESES,
          `Invalid FEN: ) without matching ( in rank ${12 - r}`,
          { rankIndex: 12 - r },
        )
      }
      if (nextHeroic) {
        throw createError(
          ErrorCode.FEN_INVALID_FORMAT,
          `Invalid FEN: + without matching ( in rank ${12 - r}`,
          { rankIndex: 12 - r },
        )
      }
    }

    // Parse game state
    this._turn = (tokens[1] as Color) || RED
    this._halfMoves = parseInt(tokens[4], 10) || 0
    this._moveNumber = parseInt(tokens[5], 10) || 1

    // Update position counts and setup flags
    this._updatePositionCounts()
    this._airDefense = updateAirDefensePiecesPosition(this)
  }

  /**
   * Updates position counts and setup flags
   * @private
   */
  private _updatePositionCounts(): void {
    const fen = this.fen()

    // Update position count for threefold repetition detection
    if (!(fen in this._positionCount)) {
      this._positionCount[fen] = 0
    }
    this._positionCount[fen]++

    // Update setup flags
    this._header['SetUp'] = '1'
    this._header['FEN'] = fen
  }

  /**
   * Generates the FEN (Forsyth-Edwards Notation) string representing the current board position.
   * The FEN includes piece placement, active color, and move counters in a standardized format.
   * @returns The FEN string for the current position
   */
  fen(deployMode = false): string {
    // If there's an active move session, return extended FEN with CURRENT board state
    // Check this FIRST to avoid unnecessary board calculation
    if (deployMode && this._session) {
      return this._session.toFenString()
    }

    let fen = ''
    let empty = 0

    for (let i = 0; i < VALID_SQUARES.length; i++) {
      const sq = VALID_SQUARES[i]
      const piece = this._board[sq]

      if (piece) {
        if (empty > 0) {
          fen += empty
          empty = 0
        }
        const san = makeSanPiece(piece, false)
        const toCorrectCase = piece.color === RED ? san : san.toLowerCase()
        fen += toCorrectCase
      } else {
        empty++
      }

      const nextSq = VALID_SQUARES[i + 1]
      if (nextSq !== undefined && rank(nextSq) !== rank(sq)) {
        if (empty > 0) {
          fen += empty
          empty = 0
        }
        fen += '/'
      }
    }

    if (empty > 0) {
      fen += empty
    }

    const castling = '-' // No castling
    const epSquare = '-' // No en passant

    const baseFEN = [
      fen,
      this._turn,
      castling,
      epSquare,
      this._halfMoves,
      this._moveNumber,
    ].join(' ')

    return baseFEN
  }

  /**
   * Retrieves a piece from the specified square on the board.
   * Can optionally search for a specific piece type within a stack of pieces.
   * @param square - The square to examine, either as algebraic notation (e.g., 'e4') or internal coordinate
   * @param pieceType - Optional piece type to search for specifically within a stack
   * @returns The piece at the square, or undefined if no piece is found or the specified type is not present
   */
  get(square: Square | number, pieceType?: PieceSymbol): Piece | undefined {
    const sq = typeof square === 'number' ? square : SQUARE_MAP[square]
    if (sq === undefined) return undefined

    const piece = this._board[sq]
    if (!piece) return undefined

    // If no specific piece type requested or the piece matches the requested type, return it
    if (!pieceType || piece.type === pieceType) return piece

    return piece.carrying?.find((p) => p.type === pieceType)
  }

  /**
   * Places a piece on the specified square of the board.
   * Validates the piece and square before placement, ensuring the operation is legal.
   * @param piece - The piece to place
   * @param piece.type - The type of piece
   * @param piece.color - The color of the piece
   * @param piece.heroic - Whether the piece is heroic
   * @param piece.carrying - Optional pieces being carried by this piece
   * @param square - The square to place the piece on
   * @param allowCombine - Whether to allow combining with existing pieces
   * @returns True if the piece was successfully placed, false otherwise
   */
  put(
    {
      type,
      color,
      heroic = false,
      carrying = undefined,
    }: {
      type: PieceSymbol
      color: Color
      heroic?: boolean
      carrying?: Piece[]
    },
    square: Square,
    allowCombine = false,
  ): boolean {
    if (!(square in SQUARE_MAP)) {
      throw createError(
        ErrorCode.BOARD_INVALID_SQUARE,
        `Invalid square: ${square}`,
        { square },
      )
    }
    const sq = SQUARE_MAP[square]

    // Validate terrain EARLY only when NOT combining
    // (When combining, the final piece type may differ from input type)
    if (!allowCombine) {
      if (type === NAVY) {
        if (!NAVY_MASK[sq]) {
          throw createError(
            ErrorCode.BOARD_INVALID_TERRAIN,
            `Invalid terrain: Navy cannot be placed on ${algebraic(sq)}`,
            { square: algebraic(sq), type: NAVY },
          )
        }
      } else if (!LAND_MASK[sq]) {
        throw createError(
          ErrorCode.BOARD_INVALID_TERRAIN,
          `Invalid terrain: ${type} cannot be placed on ${algebraic(sq)}`,
          { square: algebraic(sq), type },
        )
      }
    }

    let newPiece: Piece = {
      type,
      color,
      heroic: heroic ?? false,
      carrying,
    }

    if (allowCombine) {
      const existingPiece = this._board[sq]
      if (existingPiece) {
        const allPieces = [
          ...flattenPiece(existingPiece),
          ...flattenPiece(newPiece),
        ]
        const combinedPiece = combinePieces(allPieces)
        if (!combinedPiece) {
          throw createError(
            ErrorCode.COMBINATION_FAILED,
            `Failed to combine pieces at ${algebraic(sq)}`,
            { square: algebraic(sq) },
          )
        }
        newPiece = combinedPiece
      }

      // Validate terrain for the FINAL combined piece type
      if (newPiece.type === NAVY) {
        if (!NAVY_MASK[sq]) {
          throw createError(
            ErrorCode.BOARD_INVALID_TERRAIN,
            `Invalid terrain: Navy cannot be placed on ${algebraic(sq)}`,
            { square: algebraic(sq), type: NAVY },
          )
        }
      } else if (!LAND_MASK[sq]) {
        throw createError(
          ErrorCode.BOARD_INVALID_TERRAIN,
          `Invalid terrain: ${newPiece.type} cannot be placed on ${algebraic(sq)}`,
          { square: algebraic(sq), type: newPiece.type },
        )
      }
    }

    // Cache haveCommander result to avoid multiple calls
    const newPieceHasCommander = haveCommander(newPiece)

    // Handle commander limit
    if (
      newPieceHasCommander &&
      this._commanders[color] !== -1 &&
      this._commanders[color] !== sq
    ) {
      throw createError(
        ErrorCode.COMMANDER_LIMIT_EXCEEDED,
        `Commander limit reached for ${color}`,
        { color },
      )
    }

    // Handle replacing enemy commander
    const currentPiece = this._board[sq]
    if (
      currentPiece &&
      haveCommander(currentPiece) &&
      currentPiece.color !== color &&
      this._commanders[currentPiece.color] === sq
    ) {
      this._commanders[currentPiece.color] = -1
    }

    // Place the piece or stack
    this._board[sq] = newPiece
    if (newPieceHasCommander) {
      this._commanders[color] = sq
    }

    if (BASE_AIRDEFENSE_CONFIG[newPiece.type]) {
      this._airDefense = updateAirDefensePiecesPosition(this)
    }

    return true
  }

  /**
   * Removes a piece from the specified square on the board.
   * Can optionally target a specific piece type within a stack of pieces.
   * @param square - The square to remove the piece from, in algebraic notation (e.g., 'e4')
   * @param pieceToRemove - Optional specific piece to remove from the stack
   * @returns The removed piece object, or undefined if square is invalid/empty
   * @throws Error if pieceToRemove is specified but not found in the stack
   */
  remove(square: Square, pieceToRemove?: Piece): Piece | undefined {
    if (!(square in SQUARE_MAP)) return undefined
    const sq = SQUARE_MAP[square]
    const currentPiece = this._board[sq]
    if (!currentPiece) return undefined

    let extracted: Piece

    if (pieceToRemove) {
      // Partial removal - extractPieces will throw if piece not found
      const result = extractPieces(currentPiece, pieceToRemove)
      extracted = result.extracted

      if (result.remaining) {
        this._board[sq] = result.remaining
      } else {
        delete this._board[sq]
      }
    } else {
      // Full removal (legacy behavior)
      extracted = currentPiece
      delete this._board[sq]
    }

    // Update side effects for removed piece
    this._updateAfterRemoval(extracted, sq)

    return extracted
  }

  /**
   * Updates commander tracking and air defense after piece removal.
   * @private
   */
  private _updateAfterRemoval(removedPiece: Piece, sq: number): void {
    const { color } = removedPiece

    // Update commander tracking if removed
    if (haveCommander(removedPiece) && this._commanders[color] === sq) {
      this._commanders[color] = -1
    }

    // Update air defense if any removed piece has AD capability
    if (
      BASE_AIRDEFENSE_CONFIG[removedPiece.type] ||
      removedPiece.carrying?.some((p) => BASE_AIRDEFENSE_CONFIG[p.type])
    ) {
      this._airDefense = updateAirDefensePiecesPosition(this)
    }
  }

  // --- Main Move Generation ---
  private _getMovesCacheKey(args: {
    legal?: boolean
    pieceType?: PieceSymbol
    square?: Square
    deploy?: boolean
  }): string {
    // Key based on FEN, deploy state, and arguments
    const fen = this.fen()

    let deployState = 'none'
    if (args.deploy) {
      deployState = `${args.square}:${this.turn()}`
    } else if (this._session) {
      deployState = `session:${this._session.moves.length}`
    }

    const { legal = true, pieceType, square } = args
    return `${fen}|deploy:${deployState}|legal:${legal}|pieceType:${pieceType ?? ''}|square:${square ?? ''}`
  }

  private _moves({
    legal = true,
    pieceType: filterPiece = undefined,
    square: filterSquare = undefined,
    deploy = false,
  }: {
    legal?: boolean
    pieceType?: PieceSymbol
    square?: Square
    deploy?: boolean
  } = {}): InternalMove[] {
    if (deploy) {
      if (!filterSquare)
        throw createError(
          ErrorCode.MOVE_INVALID_DESTINATION,
          'Deploy move error: square is required',
        )
    }
    const cacheKey = this._getMovesCacheKey({
      legal,
      pieceType: filterPiece,
      square: filterSquare,
      deploy,
    })
    if (this._movesCache.has(cacheKey)) {
      return this._movesCache.get(cacheKey)!
    }
    const us = this.turn()
    let allMoves: InternalMove[] = []

    // Generate moves using unified wrapper that handles session detection
    // For deploy mode, convert square to internal format if provided
    const squareFilter =
      deploy && filterSquare ? SQUARE_MAP[filterSquare] : filterSquare
    allMoves = generateMoves(this, squareFilter, filterPiece)

    // Filter illegal moves (leaving commander in check)
    let result: InternalMove[]
    if (legal) {
      result = this._filterLegalMoves(allMoves, us) as InternalMove[]
    } else {
      result = allMoves
    }
    this._movesCache.set(cacheKey, result)
    return result
  }

  /**
   * Checks if the commander of the given color is directly exposed
   * (horizontally or vertically) to the enemy commander.
   * @param color The color of the commander to check.
   * @returns True if the commander is exposed, false otherwise.
   * @private
   */
  private _isCommanderExposed(color: Color): boolean {
    const usCommanderSq = this._commanders[color]
    const them = swapColor(color)
    const themCommanderSq = this._commanders[them]

    // If either commander is off board (e.g., during setup or error), they can't be exposed
    if (usCommanderSq === -1 || themCommanderSq === -1) {
      return false
    }

    const constraints = getCommanderExposureConstraints(
      this,
      usCommanderSq,
      themCommanderSq,
    )

    // If getCommanderExposureConstraints returns a set containing the current square,
    // it means the current square is exposed.
    return !!constraints && constraints.has(usCommanderSq)
  }

  /**
   * Get the square of the commander of the given color.
   * @param color The color of the commander.
   * @returns The square index of the commander, or -1 if not on board.
   */
  public getCommanderSquare(color: Color): number {
    return this._commanders[color]
  }

  // Helper method to filter legal moves
  private _filterLegalMoves(moves: InternalMove[], us: Color): InternalMove[] {
    const legalMoves: InternalMove[] = []

    for (const move of moves) {
      try {
        // DELAYED VALIDATION: Allow deploy moves that could be part of check escape sequences
        // Validation will happen at commit time (allows deploy sequences to escape check)
        const isDeploy = (move.flags & BITS.DEPLOY) !== 0
        if (isDeploy) {
          // Check if this is a deploy move from a stack containing the Commander
          const fromPiece = this.get(move.from)
          const hasCommander =
            fromPiece &&
            (fromPiece.type === COMMANDER ||
              fromPiece.carrying?.some((p) => p.type === COMMANDER))

          // If commander is in the stack, allow the deploy move (might be escape sequence)
          // Or if session already active, allow all deploy moves
          if (this._session || hasCommander) {
            legalMoves.push(move)
            continue
          }
        }

        // Execute move temporarily without affecting history or session
        const command = this._executeTemporarily(move)

        // A move is legal if it doesn't leave the commander attacked AND doesn't expose the commander
        // Optimization: If it's a Commander move, we trusted generating logic to handle exposure.
        // We only need to check if it's attacked.
        const movingPiece = this.get(move.from)
        const isCommanderMove =
          movingPiece && movingPiece.type === COMMANDER && !isDeploy

        if (isCommanderMove) {
          if (!this._isCommanderAttacked(us)) {
            legalMoves.push(move)
          }
        } else {
          // Normal check for other pieces (uncovering commander)
          if (!this.isCommanderInDanger(us)) {
            legalMoves.push(move)
          }
        }

        // Undo the test move
        command.undo()
        this._movesCache.clear()
      } catch (error) {
        // Log the error for debugging
        logger.error(error, 'Error during move validation, restoring state')
        // If there's an error, restore the initial state and continue
        this._session = null
      }
    }

    // Safety check: ensure we end up in the same deploy state we started with
    // This should only trigger if something went wrong (e.g., errors during filtering)

    return legalMoves
  }

  /**
   * Generates all legal moves available in the current position.
   * Can be filtered by square, piece type, or return format (verbose vs. algebraic notation).
   * @param options - Configuration options for move generation
   * @param options.square - Generate moves only for pieces on this specific square
   * @param options.pieceType - Generate moves only for this specific piece type
   * @param options.verbose - If true, returns InternalMove objects; if false, returns SAN strings
   * @returns An array of legal moves, either as InternalMove objects or algebraic notation strings
   */
  moves({
    verbose = false,
    square = undefined,
    pieceType = undefined,
  }: {
    verbose?: boolean
    square?: Square
    pieceType?: PieceSymbol
  } = {}): string[] | StandardMove[] {
    const internalMoves = this._moves({
      square,
      pieceType,
      legal: true,
    })

    if (verbose) {
      return internalMoves.map((move) => {
        const [san, lan] = moveToSanLan(move, internalMoves)

        return StandardMove.fromExecutedMove({
          color: move.color,
          from: algebraic(move.from),
          to: algebraic(move.to),
          piece: move.piece,
          captured: move.captured,
          flags: Object.keys(BITS)
            .filter((flag) => BITS[flag] & move.flags)
            .map((flag) => FLAGS[flag])
            .join(''),
          before: this.fen(),
          after: '?',
          san,
          lan,
        })
      })
    } else {
      // Generate SAN strings (simple, no temp execute)
      return internalMoves.map((move) => moveToSanLan(move, internalMoves)[0])
    }
  }

  // --- Move Execution/Undo (Updated for Stay Capture & Deploy) ---

  /**
   * Execute a command temporarily for testing/validation
   * Does NOT add to history or deploy session
   * Caller MUST call command.undo() to restore state
   */
  private _executeTemporarily(move: InternalMove): CTLMoveCommandInteface {
    const command = createMoveCommand(this, move)
    command.execute()
    this._movesCache.clear()
    return command
  }

  private _undoMove(): InternalMove | InternalMove[] | null {
    const old = this._history.pop()
    if (!old) return null

    const command = old.command // Get the command object

    // Undo everything (restores state and board)
    // The command now includes the StateUpdateAction internally
    command.undo()
    this._session = null

    // Clear moves cache since board state has changed
    this._movesCache.clear()

    // Return the original InternalMove data
    // For sequence commands, we can't represent the entire sequence as a single InternalMove
    if ('moves' in command) {
      return command.moves // Return array of moves for sequences
    } else {
      return command.move // Return single move
    }
  }

  /**
   * Undoes the last move made on the board, restoring the previous position.
   * Reverts all changes including piece positions, game state, and move counters.
   *
   * If there's an active deploy session, undoes from the session first.
   * Otherwise, undoes from history.
   */
  public undo(): void {
    // Priority 1: Check active session with moves
    if (this._session && !this._session.isEmpty) {
      this._session.undoLastMove()

      // Clear moves cache since board state has changed
      this._movesCache.clear()

      // After undoing, the session might have cleared itself if it became empty.
      // No further action on the session is needed here.
      return
    }

    // Priority 2: Check if there's any session but no commands
    // This means we're in an inconsistent state or all moves have been undone
    if (this._session) {
      // Clear any remaining session - there's nothing to undo
      this._session = null
      return
    }

    // Priority 3: Undo from history (normal moves)
    this._undoMove()
  }

  /**
   * Cancels the current deploy session, reverting all deploy moves made so far.
   */
  public cancelSession(): void {
    if (this._session) {
      this._session.cancel()
      this._session = null
      this._movesCache.clear()
    }
  }

  /**

     * Get the current move session

     */
  public getSession(): MoveSession | null {
    return this._session
  }

  /**
   * Set the move session
   */
  public setSession(session: MoveSession | null): void {
    this._session = session
  }

  /**
   * Commit the current deploy session.
   *
   * The session has already applied moves to the board incrementally.
   * This method:
   * - Validates commander safety (check escape)
   * - Commits session to get command
   * - Adds to history
   * - Clears the session
   *
   * @returns Result object with success status and optional error message
   */
  public commitSession(): {
    success: boolean
    reason?: string
    result?: MoveResult
  } {
    if (!this._session) {
      return {
        success: false,
        reason: 'No active session to commit',
      }
    }

    if (this._session.moves.length === 0) {
      return {
        success: false,
        reason: 'Cannot commit empty session',
      }
    }

    try {
      const { command, result } = this._session.commit()

      // State update is already handled and attached by MoveSession.commit()
      // We just need to store the command in history

      this._history.push({
        command: command,
      })

      // 4. Clear session
      this.setSession(null)

      return { success: true, result }
    } catch (e: any) {
      return { success: false, reason: e.message }
    }
  }

  /**
   * Checks if the current move session can be committed.
   * Returns true if there is an active session and it is valid to commit.
   * Returns false if no session or if session is invalid (e.g. commander in check).
   */
  public canCommitSession(): boolean {
    if (!this._session) return false
    if (this._session.isEmpty) return false
    return this._session.canCommit()
  }

  /**
   * Identifies all pieces of a specific color that can attack a given square.
   * Considers piece movement patterns, ranges, and special attack mechanisms including stacked pieces.
   * @param square - The target square to check for attackers, in internal coordinate format
   * @param attackerColor - The color of pieces to check for attacking capability
   * @returns An array of objects containing the square and type of pieces that can attack the target square
   */
  getAttackers(
    square: number,
    attackerColor: Color,
    assumeTargetType?: PieceSymbol,
  ): { square: number; type: PieceSymbol }[] {
    const attackers: { square: number; type: PieceSymbol }[] = []

    // Use assumed type if provided, otherwise get from board
    // Note: If assumeTargetType is provided, we treat valid piece types as existing
    // If assumeTargetType is undefined, we check the board.
    let isLandPiece = false

    if (assumeTargetType) {
      isLandPiece = assumeTargetType !== NAVY
    } else {
      isLandPiece = this.get(square)?.type !== NAVY
    }

    const isDiagonal = (offset: number) => DIAGONAL_OFFSETS.includes(offset)

    // Check in all directions from the target square
    // Use ALL_OFFSETS to check both orthogonal and diagonal directions
    for (const offset of ALL_OFFSETS) {
      let currentSquare = square
      let pieceBlocking = false
      let distance = 0

      // Check up to 5 squares in each direction (maximum range of heroic air_force)
      while (distance < 5) {
        currentSquare += offset
        distance++

        // Stop if we're off the board
        if (!isSquareOnBoard(currentSquare)) break

        const piece = this._board[currentSquare]

        // If no piece at this square, continue to next square in this direction
        if (!piece) continue

        // Check if any piece in the stack can attack the target
        if (piece.color === attackerColor) {
          // Use flattenPiece to process both the main piece and carried pieces with the same logic
          const allPieces = flattenPiece(piece)
          const isOffsetDiagonal = isDiagonal(offset)

          for (const singlePiece of allPieces) {
            // No need to check color again - flattenPiece returns pieces from the same stack
            // Get movement configuration for this piece
            const config = getPieceMovementConfig(
              singlePiece.type,
              singlePiece.heroic ?? false,
            )

            // Early exit: Skip if piece can't move diagonally but offset is diagonal
            if (!config.canMoveDiagonal && isOffsetDiagonal) {
              continue
            }

            // Calculate effective capture range (reduced for navy attacking land pieces)
            let captureRange = config.captureRange
            if (isLandPiece && config.specialRules?.navyAttackMechanisms) {
              captureRange--
            }

            // Check if distance is within range before doing expensive checks
            if (distance > captureRange) {
              continue
            }

            // Check if piece can attack through blocking pieces
            if (pieceBlocking && !config.captureIgnoresPieceBlocking) {
              continue
            }

            // Special handling for air force - check air defense zones
            let airForceCanCapture = true
            if (singlePiece.type === AIR_FORCE) {
              const checkAirDefenseZone = getCheckAirDefenseZone(
                this,
                currentSquare,
                swapColor(attackerColor),
                getOppositeOffset(offset)!,
                !!singlePiece.heroic,
              )
              let res = -1
              let i = 0
              while (res < 2 && i < distance) {
                res = checkAirDefenseZone()
                i++
              }
              airForceCanCapture = res < 2
            }

            // Add to attackers if all conditions are met
            if (airForceCanCapture) {
              attackers.push({
                square: currentSquare,
                type: singlePiece.type,
              })
            }
          }
        }

        // Mark that we've encountered a piece in this direction
        pieceBlocking = true
      }
    }

    return attackers
  }

  /**
   * Checks if the commander of the given color is in danger.
   * A commander is in danger if it is either attacked by any enemy piece
   * or directly exposed to the enemy commander (face-off rule).
   * @param color The color of the commander to check.
   * @returns True if the commander is in danger, false otherwise.
   */
  public isCommanderInDanger(color: Color): boolean {
    // A commander is in danger if strictly attacked OR is exposed to enemy commander
    return this._isCommanderAttacked(color) || this._isCommanderExposed(color)
  }

  // --- Check/Game Over Detection (Updated for Stay Capture) ---
  private _isCommanderAttacked(color: Color): boolean {
    const kingSq = this._commanders[color]
    if (kingSq === -1) return true // Commander captured = loss = considered 'attacked' for game over

    // Use getAttackers to check if any opponent pieces can attack the commander
    const opponent = swapColor(color)
    const attackers = this.getAttackers(kingSq, opponent)

    // If there are any attackers, the commander is under attack
    return attackers.length > 0
  }

  /**
   * Determines whether the current player's commander (king) is under attack.
   * Checks if any opponent piece can capture the commander in the current position.
   * @returns True if the current player is in check, false otherwise
   */
  isCheck(): boolean {
    return this._isCommanderAttacked(this._turn)
  }

  /**
   * Determines whether the current player is in checkmate.
   * Checkmate occurs when the commander is in check and no legal moves can escape the threat.
   *
   * @returns True if the current player is in checkmate, false otherwise
   */
  isCheckmate(): boolean {
    // Checkmate = Commander is attacked AND no legal moves exist
    return this.isCheck() && this._moves({ legal: true }).length === 0
  }

  // TODO: Implement isInsufficientMaterial, isThreefoldRepetition, isDrawByFiftyMoves based on variant rules
  /**
   * Determines whether the game is a draw due to the fifty-move rule.
   * The fifty-move rule declares a draw if 50 moves pass without a capture or pawn move.
   * @returns True if the game is a draw by the fifty-move rule, false otherwise
   */
  isDrawByFiftyMoves(): boolean {
    return this._halfMoves >= 100 // 50 moves per side
  }

  /**
   * Determines whether the game is a draw due to threefold repetition.
   * A draw is declared when the same position occurs three times with the same player to move.
   * @returns True if the game is a draw by threefold repetition, false otherwise
   */
  isThreefoldRepetition(): boolean {
    return this._positionCount[this.fen()] >= 3
  }

  isStalemate(): boolean {
    return !this.isCheck() && this._moves().length === 0
  }

  /**
   * Determines whether the current game state constitutes a draw.
   * Checks for all possible draw conditions including fifty-move rule and threefold repetition.
   * @returns True if the game is a draw by any applicable rule, false otherwise
   */
  isDraw(): boolean {
    return (
      this.isDrawByFiftyMoves() ||
      this.isThreefoldRepetition() ||
      this.isStalemate()
    )
  }

  isCommanderCaptured(): boolean {
    return this._commanders[RED] === -1 || this._commanders[BLUE] === -1
  }

  isGameOver(): boolean {
    return this.isCheckmate() || this.isDraw() || this.isCommanderCaptured()
  }

  // --- SAN Parsing/Generation (Updated for Stay Capture & Deploy) ---

  /**
  /**
   * Parses a move in Standard Algebraic Notation (SAN) and returns the corresponding
   * internal move object if legal. Handles various formats including simplified
   * (e.g., "Nc3"), full (e.g., "Nb1-c3", "Ie2xe3"), stay capture ("Td2<d3", "A<b2", "A2<b2", "Ab<b2"),
   * deploy ("(T|I)c2>c3", "(T|I)c2>xd3"), and combination ("T&e6(T|I)").
   *
   * @param move The move string in SAN format.
   * @param strict If true, requires stricter format matching (currently unused).
   * @returns The matching InternalMove object, or null if the move is illegal, ambiguous, or unparseable.
   * @private
   */
  private _moveFromSan(move: string, strict = false): InternalMove | null {
    const cleanMove = strippedSan(move)
    let pieceType = inferPieceType(cleanMove)
    let moves = this._moves({ legal: true, pieceType: pieceType })

    // strict parser
    for (let i = 0, len = moves.length; i < len; i++) {
      const [san, lan] = moveToSanLan(moves[i], moves)
      if (cleanMove === strippedSan(san) || cleanMove === strippedSan(lan)) {
        moves[i].san = san
        moves[i].lan = lan
        return moves[i]
      }
    }

    // the strict parser failed
    if (strict) {
      return null
    }
    let heroic = undefined
    let matches = undefined
    let from = undefined
    let to = undefined
    let flag = undefined
    let check = undefined

    let overlyDisambiguated = false

    const regex =
      /^(\(.*\))?(\+)?([CITMEAGSFNH])?([a-k]?(?:1[0-2]|[1-9])?)([x<>\+&-]|>x)?([a-k](?:1[0-2]|[1-9]))([#\^]?)?$/
    matches = cleanMove.match(regex)
    if (matches) {
      heroic = matches[2]
      pieceType = matches[3] as PieceSymbol
      from = matches[4] as Square
      flag = matches[5]
      to = matches[6] as Square
      check = matches[7]

      if (from.length == 1) {
        overlyDisambiguated = true
      }
    }

    moves = this._moves({
      legal: true,
      ...(pieceType && { pieceType: pieceType }),
    })
    if (!to) {
      return null
    }
    for (let i = 0, len = moves.length; i < len; i++) {
      const [curSan, curLan] = moveToSanLan(moves[i], moves)
      if (!from) {
        // if there is no from square, it could be just 'x' missing from a capture
        if (
          cleanMove === strippedSan(curSan).replace(/[x<>+&-]|>x/g, '') ||
          cleanMove === strippedSan(curLan).replace(/[x<>+&-]|>x/g, '')
        ) {
          moves[i].san = curSan
          moves[i].lan = curLan
          return moves[i]
        }
        // hand-compare move properties with the results from our permissive regex
      } else if (
        (!pieceType || pieceType.toLowerCase() == moves[i].piece.type) &&
        SQUARE_MAP[from] == moves[i].from &&
        SQUARE_MAP[to] == moves[i].to
      ) {
        moves[i].san = curSan
        moves[i].lan = curLan
        return moves[i]
      } else if (overlyDisambiguated) {
        /*
         * SPECIAL CASE: we parsed a move string that may have an unneeded
         * rank/file disambiguator (e.g. Nge7).  The 'from' variable will
         */

        const square = algebraic(moves[i].from)
        if (
          (!pieceType || pieceType.toLowerCase() == moves[i].piece.type) &&
          SQUARE_MAP[to] == moves[i].to &&
          (from == square[0] || from == square[1])
        ) {
          moves[i].san = curSan
          moves[i].lan = curLan
          return moves[i]
        }
      }
    }

    return null
  }

  /**
   * Converts a move object or validates an InternalMove by finding the matching legal move.
   * @param move - Either a move object with from/to squares, or an InternalMove to validate
   * @returns The matching InternalMove with SAN/LAN notation populated
   * @throws Error if no matching legal move is found or if multiple matches exist
   * @private
   */
  private _moveFromObject(
    move:
      | {
          from: string
          to: string
          piece?: PieceSymbol
          stay?: boolean
          deploy?: boolean
        }
      | InternalMove,
  ): InternalMove {
    // Check if this is an InternalMove (has numeric from/to properties)
    const isInternalMove =
      typeof (move as InternalMove).from === 'number' &&
      typeof (move as InternalMove).to === 'number'

    let fromSq: number
    let toSq: number
    let pieceType: PieceSymbol | undefined
    let stayFilter: boolean | undefined
    let deployFilter: boolean | undefined
    let inputInternalMove: InternalMove | undefined

    if (isInternalMove) {
      // InternalMove validation path
      const internalMove = move as InternalMove
      inputInternalMove = internalMove
      fromSq = internalMove.from
      toSq = internalMove.to
      pieceType = internalMove.piece.type
      stayFilter = (internalMove.flags & BITS.STAY_CAPTURE) !== 0
      deployFilter = (internalMove.flags & BITS.DEPLOY) !== 0
    } else {
      // Move object parsing path
      const moveObj = move as {
        from: string
        to: string
        piece?: PieceSymbol
        stay?: boolean
        deploy?: boolean
      }
      const fromSqMapped = SQUARE_MAP[moveObj.from]
      const toSqMapped = SQUARE_MAP[moveObj.to]

      if (fromSqMapped === undefined || toSqMapped === undefined) {
        throw new Error(
          `Invalid square in move object: ${JSON.stringify(move)}`,
        )
      }

      fromSq = fromSqMapped
      toSq = toSqMapped
      pieceType = moveObj.piece
      stayFilter = moveObj.stay
      deployFilter = moveObj.deploy
    }

    // Find matching move in legal moves
    const legalMoves = this._moves({
      legal: true,
      square: algebraic(fromSq),
      ...(pieceType && { pieceType }),
    })

    const foundMoves: InternalMove[] = []
    for (const m of legalMoves) {
      const isStayMove = (m.flags & BITS.STAY_CAPTURE) !== 0
      const isDeployMove = (m.flags & BITS.DEPLOY) !== 0

      if (
        m.from === fromSq &&
        m.to === toSq &&
        (pieceType === undefined || m.piece.type === pieceType) &&
        (stayFilter === undefined || stayFilter === isStayMove) &&
        (deployFilter === undefined || deployFilter === isDeployMove)
      ) {
        // Generate SAN/LAN for the move
        const [san, lan] = moveToSanLan(m, legalMoves)
        m.san = san
        m.lan = lan
        foundMoves.push(m)
      }
    }

    if (foundMoves.length === 0) {
      throw new Error(`No matching legal move found: ${JSON.stringify(move)}`)
    }
    if (foundMoves.length > 1) {
      throw new Error(
        `Multiple matching legal moves found: ${JSON.stringify(move)}`,
      )
    }

    const foundMove = foundMoves[0]

    // If input was an InternalMove and everything matches, preserve the input's piece
    // This is important for recombine operations where the piece may have specific
    // carrying information that differs from the freshly generated legal move
    if (inputInternalMove) {
      // Verify flags match (this is a safety check)
      if (inputInternalMove.flags === foundMove.flags) {
        // Return a move with the input's piece but the generated SAN/LAN
        return {
          ...inputInternalMove,
          san: foundMove.san,
          lan: foundMove.lan,
        }
      }
    }

    return foundMove
  }

  /**
   * Executes a move on the board, accepting algebraic notation, move object, or InternalMove format.
   * Validates the move legality before execution and updates the game state accordingly.
   * @param move - The move to execute: SAN string (e.g., 'Nf3'), move object with from/to squares, or InternalMove to validate
   * @param options - Configuration options for move execution
   * @param options.strict - Whether to use strict parsing rules for algebraic notation moves
   * @returns MoveResult indicating completion status and the move object
   * @throws Error if the move is invalid, illegal, or ambiguous
   */
  public move(
    move:
      | string
      | {
          from: string
          to: string
          piece?: PieceSymbol
          stay?: boolean
          deploy?: boolean
        }
      | InternalMove,
    { strict = false }: { strict?: boolean } = {},
  ): MoveResult | null {
    let internalMove: InternalMove | null = null

    // 1. Parse move
    if (typeof move === 'string') {
      internalMove = this._moveFromSan(move, strict)
    } else if (typeof move === 'object') {
      internalMove = this._moveFromObject(move)
    }

    // 2. Validate move
    if (!internalMove) {
      throw new Error(`Invalid or illegal move: ${JSON.stringify(move)}`)
    }

    // 4. Execute move
    return handleMove(this, internalMove)
  }
  // deployMove() method removed - use handleDeployMove() from move-session.ts instead
  // The new architecture uses MoveSession for unified move handling

  /**
   * Executes a recombine operation safely.
   * @param option - The recombine option containing the square and piece to combine
   * @returns MoveResult when complete, or intermediate result if session needs more moves
   */
  public recombine(option: RecombineOption): MoveResult {
    return executeRecombine(this, option)
  }

  /**
   * Retrieves the color of the player who has the current turn to move.
   * @returns The color (RED or BLUE) of the player whose turn it is to move
   */
  turn(): Color {
    return this._turn
  }

  // ... (board, squareColor, history, comments, moveNumber need review/adaptation) ...
  /**
   * Generates a 2D array representation of the current board state.
   * Each element contains piece information or null for empty squares.
   * @returns A 2D array representing the board, with each element containing piece data or null for empty squares
   */
  board(): ({
    square: Square
    type: PieceSymbol
    color: Color
    heroic: boolean
  } | null)[][] {
    const output = []
    let row = []

    for (let r = 0; r < 12; r++) {
      // Iterate ranks 0-11
      row = []
      for (let f = 0; f < 11; f++) {
        // Iterate files 0-10
        const sq = r * 16 + f
        const piece = this._board[sq]
        if (piece) {
          row.push({
            square: algebraic(sq),
            type: piece.type,
            color: piece.color,
            heroic: piece.heroic ?? false,
          })
        } else {
          row.push(null)
        }
      }
      output.push(row)
    }
    return output
  }

  /**
   * Retrieves the complete move history of the current game.
   * Can return moves either as algebraic notation strings or detailed Move objects.
   * Replays all moves to validate history integrity and generate notation.
   * @param options - Configuration options for history format
   * @param options.verbose - If true, returns Move/DeployMove objects; if false, returns SAN strings
   * @returns An array containing all moves made in the game, in chronological order
   */
  history(): string[]
  history(options: { verbose: true }): (StandardMove | DeploySequence)[]
  history(options: { verbose: false }): string[]
  history(options?: {
    verbose?: boolean
  }): string[] | (StandardMove | DeploySequence)[]
  history(
    options: { verbose?: boolean } = {},
  ): string[] | (StandardMove | DeploySequence)[] {
    const { verbose = false } = options

    // Undo all moves to get back to initial state
    // We assume the game was constructed with the correct initial FEN/state
    const allMoves: InternalMove[] = []
    while (this._history.length > 0) {
      const moves = this._undoMove()
      if (moves) {
        if (Array.isArray(moves)) {
          // Flatten array of moves (reverse order because unchecked unshift reverses order later?
          // No, undoMove returns them in forward order for the specific command?
          // Let's assume command.moves is [move1, move2].
          // We are undoing from end.
          // History: [Sequence(m1, m2), Standard(m3)]
          // Pop Standard(m3) -> returns m3. Unshift -> [m3]
          // Pop Sequence(m1, m2) -> returns [m1, m2]. Unshift -> [m1, m2, m3] ??
          // We need [m1, m2, m3].
          // Array.prototype.unshift adds items to the beginning.
          // array.unshift(item) -> [item, ...]
          // array.unshift(...items) -> [item1, item2, ...] if unshift arguments order is preserved.
          // Yes: [a].unshift(b, c) -> [b, c, a].
          allMoves.unshift(...moves)
        } else {
          allMoves.unshift(moves)
        }
      }
    }

    const results: (StandardMove | DeploySequence)[] = []

    // Replay history using move() to verify/reconstruct
    // This allows re-using all the validation and session logic within move()
    // but we pass the InternalMove directly so we don't have to re-parse SAN.

    for (let i = 0; i < allMoves.length; i++) {
      const move = allMoves[i]
      const isDeploy = (move.flags & BITS.DEPLOY) !== 0

      // Execute move using the public move API with the InternalMove object
      // This ensures all proper validation and session handling logic is used
      // We don't need to manually handle commits here because handleMove (called by move)
      // will auto-commit normal moves, and we can check result for deploy moves.

      const result = this.move(move)

      if (result) {
        // For deploy moves, we might get intermediate results (incomplete session)
        // or a completed DeploySequence.
        // For standard moves, we get a StandardMove.

        // If it's a completed move (StandardMove or fully committed DeploySequence), add to results
        if (result.completed) {
          results.push(result)
        }
      }
    }

    // 4. Return formatted results
    if (verbose) {
      return results
    } else {
      return results.map((r) => r.san || '')
    }
  }

  /**
   * Retrieves the heroic status of a piece at the specified square.
   * Can optionally target a specific piece type within a stack of pieces.
   * @param square - The square to examine, either in algebraic notation or internal coordinates
   * @param pieceType - Optional piece type to check specifically within a stack
   * @returns True if the piece (or specified piece type) has heroic status, false otherwise
   */
  getHeroicStatus(square: Square | number, pieceType?: PieceSymbol): boolean {
    const piece = this.get(square, pieceType)
    return piece?.heroic ?? false
  }

  /**
   * Sets the heroic status of a piece at the specified square.
   * Can target a specific piece type within a stack or the main piece on the square.
   * @param square - The square containing the piece, either in algebraic notation or internal coordinates
   * @param pieceType - Optional piece type to modify specifically within a stack
   * @param heroic - The heroic status to assign to the piece
   * @returns True if the heroic status was successfully updated, false if the piece was not found
   */
  setHeroicStatus(
    square: Square | number,
    pieceType: PieceSymbol | undefined,
    heroic: boolean,
  ): boolean {
    const sq = typeof square === 'number' ? square : SQUARE_MAP[square]
    if (sq === undefined) return false

    const pieceAtSquare = this._board[sq]
    if (!pieceAtSquare) return false

    // Case 1: No specific piece type requested or the piece matches the requested type
    if (!pieceType || pieceAtSquare.type === pieceType) {
      pieceAtSquare.heroic = heroic
      return true
    }

    // Case 2: Check if the requested piece is being carried in a stack
    if (pieceAtSquare.carrying && pieceAtSquare.carrying.length > 0) {
      const carriedPieceIndex = pieceAtSquare.carrying.findIndex(
        (p) => p.type === pieceType,
      )

      if (carriedPieceIndex !== -1) {
        // Create a new array to avoid mutation issues
        const updatedCarrying = [...pieceAtSquare.carrying]
        updatedCarrying[carriedPieceIndex] = {
          ...updatedCarrying[carriedPieceIndex],
          heroic: heroic,
        }

        // Update the carrier with the modified carrying array
        this._board[sq] = {
          ...pieceAtSquare,
          carrying: updatedCarrying,
        }

        return true
      }
    }

    return false
  }

  /**
   * Retrieves the current air defense.
   * @returns The air defense
   */
  getAirDefense(): AirDefense {
    return this._airDefense
  }

  /**
   * Retrieves the current air defense influence.
   * @returns The air defense influence
   */
  getAirDefenseInfluence(): AirDefenseInfluence {
    return getAirDefenseInfluence(this)
  }

  /**
   * Retrieves the current full move number in the game.
   * The move number increments after both players have moved (after Blue's turn).
   * @returns The current move number of the game
   */
  moveNumber(): number {
    return this._moveNumber
  }

  /**
   * Retrieves any comment associated with the current board position.
   * Comments are stored per unique position and can provide annotations or analysis.
   * @returns The comment string for the current position, or undefined if no comment exists
   */
  getComment(): string | undefined {
    return this._comments[this.fen()]
  }
  /**
   * Associates a comment with the current board position.
   * Comments are stored per unique position and can be used for annotations or analysis.
   * @param comment - The comment text to associate with the current position
   */
  setComment(comment: string) {
    this._comments[this.fen()] = comment
  }
  /**
   * Removes any comment associated with the current board position.
   * @returns The removed comment text, or undefined if no comment was previously set
   */
  removeComment(): string | undefined {
    const comment = this._comments[this.fen()]
    delete this._comments[this.fen()]
    return comment
  }
  // Removed printTerrainZones

  /**
   * Outputs a visual text representation of the current board state to the console.
   * Useful for debugging and development purposes to visualize the board layout.
   */
  printBoard(): void {
    printBoard(this._board)
  }

  // TODO: getComments, removeComments need pruning logic like chess.js if history is mutable
}

export * from './type.js'

/**
 * Validates whether a FEN (Forsyth-Edwards Notation) string is properly formatted and legal.
 * Performs comprehensive validation of all FEN components including piece placement and game state.
 * @param fen - The FEN string to validate for correctness
 * @returns true if the FEN string is valid and can be loaded, false otherwise
 */
export function validateFenString(fen: string): boolean {
  try {
    validateFen(fen)
    return true
  } catch (e) {
    return false
  }
}
