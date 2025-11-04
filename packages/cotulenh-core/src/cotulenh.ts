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
  DeployState,
  file,
  AirDefenseInfluence,
  AirDefense,
  CAPTURE_MASK,
  AIR_FORCE,
} from './type.js'
import {
  getDisambiguator,
  printBoard,
  validateFen,
  makeSanPiece,
  combinePieces,
  strippedSan,
  inferPieceType,
  flattenPiece,
  haveCommander,
} from './utils.js'
import {
  generateDeployMoves,
  generateNormalMoves,
  ORTHOGONAL_OFFSETS,
  ALL_OFFSETS,
  getPieceMovementConfig,
  getOppositeOffset,
} from './move-generation.js'
import {
  createMoveCommand,
  DeployMoveCommand,
  createDeployMoveCommand,
  CTLMoveCommandInteface,
} from './move-apply.js'
import {
  createInternalDeployMove,
  DeployMove,
  DeployMoveRequest,
  deployMoveToSanLan,
  InternalDeployMove,
  isInternalDeployMove,
} from './deploy-move.js'
import {
  AirDefensePiecesPosition,
  BASE_AIRDEFENSE_CONFIG,
  getAirDefenseInfluence,
  getCheckAirDefenseZone,
  updateAirDefensePiecesPosition,
} from './air-defense.js'
import { DeploySession } from './deploy-session.js'

// Structure for storing history states
interface History {
  move: CTLMoveCommandInteface
  commanders: Record<Color, number> // Position of commander before the move
  turn: Color
  halfMoves: number // Half move clock before the move
  moveNumber: number // Move number before the move
  deployState: DeployState | null // Snapshot of deploy state before move (legacy)
  deploySession: DeploySession | null // Snapshot of deploy session (new action-based)
}

// Public Move class (similar to chess.js) - can be fleshed out later
export class Move {
  color: Color
  from: Square
  to: Square // Destination square (piece's final location)
  piece: Piece
  captured?: Piece
  flags: string // String representation of flags
  san?: string // Standard Algebraic Notation (needs implementation)
  lan?: string // Long Algebraic Notation (needs implementation)
  before: string // FEN before move
  after: string // FEN after move

  // Constructor needs the main class instance to generate SAN, FENs etc.
  constructor(game: CoTuLenh, internal: InternalMove) {
    const { color, piece, from, to, flags, captured, combined } = internal

    this.color = color
    this.piece = piece // This is the piece that MOVED (or was deployed)
    this.from = algebraic(from) // Square the move originated from (stack location for deploy)
    this.flags = ''
    for (const flag in BITS) {
      if (BITS[flag] & flags) {
        this.flags += FLAGS[flag]
      }
    }
    if (captured) this.captured = captured
    this.to = algebraic(to)

    this.before = game.fen()

    // Generate the FEN for the 'after' key
    // For deploy moves during an active session, skip preview to avoid session corruption
    const skipPreview = !!(game['_deploySession'] && flags & BITS.DEPLOY)

    if (!skipPreview) {
      // Execute move temporarily to get FEN
      const command = game['_executeTemporarily'](internal as InternalMove)
      this.after = game.fen()
      command.undo()
      game['_movesCache'].clear()
    } else {
      // During deploy session with deploy move, we can't safely preview
      // The 'after' FEN will be the same as 'before' for now
      this.after = this.before
    }

    const [san, lan] = game['_moveToSanLan'](
      internal,
      game['_moves']({ legal: true }),
    )
    this.san = san
    this.lan = lan
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
  private _deployState: DeployState | null = null // Tracks active deploy phase (legacy)
  private _deploySession: DeploySession | null = null // Tracks active deploy session (new action-based)
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
      throw new Error(`Invalid FEN: expected 12 ranks, got ${ranks.length}`)
    }
    let parsingStack = false
    let nextHeroic = false
    for (let r = 0; r < 12; r++) {
      let col = 0
      for (let i = 0; i < ranks[r].length; i++) {
        const char = ranks[r].charAt(i)
        if (isDigit(char)) {
          col += parseInt(char)
          if (col > 11) {
            throw new Error(
              `Invalid FEN: rank ${12 - r} has too many squares (${ranks[r]})`,
            )
          }
        } else if (char === '+') {
          nextHeroic = true
        } else if (char === '(') {
          parsingStack = true
        } else if (char === ')') {
          if (parsingStack === false) {
            throw new Error(
              `Invalid FEN: ) without matching ( in rank ${12 - r}`,
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
        throw new Error(`Invalid FEN: ) without matching ( in rank ${12 - r}`)
      }
      if (nextHeroic) {
        throw new Error(`Invalid FEN: + without matching ( in rank ${12 - r}`)
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
  fen(): string {
    let empty = 0
    let fen = ''
    for (let i = SQUARE_MAP.a12; i <= SQUARE_MAP.k1 + 1; i++) {
      if (isSquareOnBoard(i)) {
        if (this._board[i]) {
          if (empty > 0) {
            fen += empty
            empty = 0
          }
          const piece = this._board[i]!

          const san = makeSanPiece(piece, false)
          const toCorrectCase = piece.color === RED ? san : san.toLowerCase()
          fen += toCorrectCase
        } else {
          empty++
        }
      } else {
        if (file(i) === 11) {
          if (empty > 0) {
            fen += empty
          }
          empty = 0
          if (i !== SQUARE_MAP.k1 + 1) {
            fen += '/'
          }
        } else {
          continue
        }
      }
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

    // If there's an active deploy session, return extended FEN with CURRENT board state
    if (this._deploySession) {
      return this._deploySession.toExtendedFEN(baseFEN)
    }

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

    const pieceAtSquare = this._board[sq]
    if (!pieceAtSquare) return undefined

    // If no specific piece type requested or the piece matches the requested type, return it
    if (!pieceType || pieceAtSquare.type === pieceType) {
      return pieceAtSquare
    }

    // Check if the requested piece is being carrying in a stack
    if (pieceAtSquare.carrying && pieceAtSquare.carrying.length > 0) {
      return pieceAtSquare.carrying.find((p) => p.type === pieceType)
    }

    return undefined
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
      carrying = undefined, // Add optional carrying pieces
    }: {
      type: PieceSymbol
      color: Color
      heroic?: boolean
      carrying?: Piece[]
    },
    square: Square,
    allowCombine = false,
  ): boolean {
    // this._movesCache.clear()
    if (!(square in SQUARE_MAP)) return false
    const sq = SQUARE_MAP[square]

    let newPiece = {
      type,
      color,
      heroic: heroic ?? false, // Default to false if undefined
      carrying,
    } as Piece
    if (allowCombine) {
      const existingPiece = this._board[sq] as Piece
      if (existingPiece) {
        const allPieces = [
          ...flattenPiece(existingPiece),
          ...flattenPiece(newPiece),
        ]
        const combinedPiece = combinePieces(allPieces)
        if (!combinedPiece) {
          throw new Error(
            `Failed to remove piece from stack at ${algebraic(sq)}`,
          )
        }
        newPiece = combinedPiece
      }
    }

    //Piece should be put on correct relative terrain.
    if (newPiece.type === NAVY) {
      if (!NAVY_MASK[sq]) return false
    } else if (!LAND_MASK[sq]) return false

    // Handle commander limit
    if (
      haveCommander(newPiece) &&
      this._commanders[color] !== -1 &&
      this._commanders[color] !== sq
    ) {
      return false
    }

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
    if (haveCommander(newPiece)) this._commanders[color] = sq

    if (BASE_AIRDEFENSE_CONFIG[newPiece.type]) {
      this._airDefense = updateAirDefensePiecesPosition(this)
    }

    // TODO: Update setup, etc.
    return true
  }

  /**
   * Removes a piece from the specified square on the board.
   * Can optionally target a specific piece type within a stack of pieces.
   * @param square - The square to remove the piece from, in algebraic notation (e.g., 'e4')
   * @returns The removed piece object, or undefined if no piece was found or the specified type was not present
   */
  remove(square: Square): Piece | undefined {
    // this._movesCache.clear()
    if (!(square in SQUARE_MAP)) return undefined
    const sq = SQUARE_MAP[square]
    const piece = this._board[sq]
    const wasHeroic = piece?.heroic

    if (!piece) return undefined

    delete this._board[sq]

    if (haveCommander(piece) && this._commanders[piece.color] === sq) {
      this._commanders[piece.color] = -1
    }
    if (BASE_AIRDEFENSE_CONFIG[piece.type]) {
      this._airDefense = updateAirDefensePiecesPosition(this)
    }

    // TODO: Update setup, etc.
    return { ...piece, heroic: wasHeroic ?? false }
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
    } else if (this._deploySession) {
      deployState = `${this._deploySession.stackSquare}:${this._deploySession.turn}:${this._deploySession.commands.length}`
    } else if (this._deployState) {
      deployState = `${this._deployState.stackSquare}:${this._deployState.turn}`
    } else {
      deployState = 'none'
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
        throw new Error('Deploy move error: square is required')
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

    // Generate moves based on game state
    // Check for deploy session first (new), then fall back to deploy state (legacy)
    const activeDeploySession =
      this._deploySession ||
      (this._deployState && this._deployState.turn === us
        ? this._deployState
        : null)

    if (activeDeploySession || deploy) {
      let deployFilterSquare: number
      if (deploy) {
        deployFilterSquare = SQUARE_MAP[filterSquare!]
      } else if (this._deploySession) {
        deployFilterSquare = this._deploySession.stackSquare
      } else {
        deployFilterSquare = this._deployState!.stackSquare
      }
      allMoves = generateDeployMoves(this, deployFilterSquare, filterPiece)
    } else {
      allMoves = generateNormalMoves(this, us, filterPiece, filterSquare)
    }

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

    // Check only orthogonal directions
    for (const offset of ORTHOGONAL_OFFSETS) {
      let sq = usCommanderSq + offset
      while (isSquareOnBoard(sq)) {
        const piece = this._board[sq]
        if (piece) {
          // If the first piece encountered is the enemy commander, we are exposed
          if (sq === themCommanderSq) {
            return true
          }
          // If it's any other piece, the line of sight is blocked in this direction
          break
        }
        sq += offset
      }
    }

    // Not exposed in any orthogonal direction
    return false
  }

  // Helper method to filter legal moves
  private _filterLegalMoves(
    moves: (InternalMove | InternalDeployMove)[],
    us: Color,
  ): (InternalMove | InternalDeployMove)[] {
    const legalMoves: (InternalMove | InternalDeployMove)[] = []

    // Save the initial deploy state to restore if corrupted
    const initialDeployState = this._deployState
    const initialDeploySession = this._deploySession
      ? this._deploySession.clone()
      : null

    for (const move of moves) {
      try {
        // Execute move temporarily without affecting history or session
        let command: CTLMoveCommandInteface
        if (isInternalDeployMove(move)) {
          // For batch deploy moves, execute and test via full _makeMove
          // These are already complete deploy sequences, so they go to history
          this._makeMove(move)
          // Will undo via _undoMove below
        } else {
          command = this._executeTemporarily(move)
        }

        // A move is legal if it doesn't leave the commander attacked AND doesn't expose the commander
        const commanderAttacked = this._isCommanderAttacked(us)
        const commanderExposed = this._isCommanderExposed(us)
        if (!commanderAttacked && !commanderExposed) {
          legalMoves.push(move)
        }

        // Undo the test move
        if (isInternalDeployMove(move)) {
          this._undoMove()
        } else {
          command!.undo()
          this._movesCache.clear()
        }
      } catch (error) {
        // If there's an error, restore the initial state and continue
        this._deployState = initialDeployState
        this._deploySession = initialDeploySession
          ? initialDeploySession.clone()
          : null
      }
    }

    // Safety check: ensure we end up in the same deploy state we started with
    // This should only trigger if something went wrong (e.g., errors during filtering)
    const currentCommandCount = this._deploySession?.commands.length || 0
    const initialCommandCount = initialDeploySession?.commands.length || 0

    if (
      currentCommandCount !== initialCommandCount ||
      !!this._deploySession !== !!initialDeploySession
    ) {
      this._deployState = initialDeployState
      this._deploySession = initialDeploySession
        ? initialDeploySession.clone()
        : null
    }

    return legalMoves
  }

  /**
   * Generates all legal moves available in the current position.
   * Can be filtered by square, piece type, or return format (verbose vs. algebraic notation).
   * @param options - Configuration options for move generation
   * @param options.square - Generate moves only for pieces on this specific square
   * @param options.pieceType - Generate moves only for this specific piece type
   * @param options.verbose - If true, returns Move objects; if false, returns SAN strings
   * @returns An array of legal moves, either as Move objects or algebraic notation strings
   */
  moves({
    verbose = false,
    square = undefined,
    pieceType = undefined,
  }: {
    verbose?: boolean
    square?: Square
    pieceType?: PieceSymbol
  } = {}): string[] | Move[] {
    const internalMoves = this._moves({
      square,
      pieceType,
      legal: true,
    }) // Generate legal moves

    if (verbose) {
      // Map to Move objects, passing current heroic status
      return internalMoves.map((move) => new Move(this, move))
    } else {
      // Generate SAN strings (needs proper implementation)
      // Pass all legal moves for ambiguity resolution
      const allLegalMoves = this._moves({ legal: true })
      return internalMoves.map(
        (move) => this._moveToSanLan(move, allLegalMoves)[0],
      )
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

  private _makeMove(move: InternalMove | InternalDeployMove) {
    const us = this.turn()
    const them = swapColor(us)

    // 1. Create the command object for this move
    let moveCommand: CTLMoveCommandInteface
    if (isInternalDeployMove(move)) {
      moveCommand = new DeployMoveCommand(this, move)
    } else {
      moveCommand = createMoveCommand(this, move)
    }

    // 2. Handle deploy session for incremental deploy moves
    const isDeployMove = !isInternalDeployMove(move) && move.flags & BITS.DEPLOY

    if (isDeployMove) {
      if (!this._deploySession) {
        // Start new deploy session
        const originalPiece = this._board[move.from]!
        this._deploySession = new DeploySession({
          stackSquare: move.from,
          turn: us,
          originalPiece: originalPiece,
          startFEN: this.fen(),
        })
      }
    }

    // Store pre-move state (for history, if needed)
    const preCommanderState = { ...this._commanders }
    const preTurn = us
    const preHalfMoves = this._halfMoves
    const preMoveNumber = this._moveNumber
    const preDeployState = this._deployState
    const preDeploySession = this._deploySession
      ? this._deploySession.clone()
      : null

    // 3. Execute the command
    try {
      moveCommand.execute()
      // Clear moves cache since board state has changed
      this._movesCache.clear()
    } catch (error) {
      throw error
    }

    // 4. Add command to session OR history (mutually exclusive!)
    if (this._deploySession && isDeployMove) {
      // During deploy: add command to session, NOT to history
      this._deploySession.addCommand(moveCommand)
    } else {
      // Normal move: add to history
      const historyEntry: History = {
        move: moveCommand,
        commanders: preCommanderState,
        turn: preTurn,
        halfMoves: preHalfMoves,
        moveNumber: preMoveNumber,
        deployState: preDeployState,
        deploySession: preDeploySession,
      }
      this._history.push(historyEntry)
    }

    // --- 4. Update General Game State AFTER command execution ---

    // Reset half moves counter if capture occurred OR commander moved
    if (
      (Array.isArray(moveCommand.move.captured) &&
        moveCommand.move.captured.length > 0) ||
      moveCommand.move.captured
    ) {
      this._halfMoves = 0
    } else {
      this._halfMoves++
    }

    // // Increment move number if Blue moved
    if (
      !isInternalDeployMove(move) &&
      us === BLUE &&
      !(move.flags & BITS.DEPLOY)
    ) {
      // Only increment if not a deploy move by blue
      this._moveNumber++
    }
    // TODO: Check for last piece auto-promotion (also needs Commander check)

    // --- Switch Turn (or maintain for deploy) ---
    // Check if we need to auto-commit deploy session BEFORE updating game state
    let shouldAutoCommit = false
    if (this._deploySession && !isInternalDeployMove(move)) {
      const isDeployMove = !!(move.flags & BITS.DEPLOY)
      const isFromStackSquare = move.from === this._deploySession.stackSquare

      if (isDeployMove) {
        // Deploy move: check if all pieces are now deployed
        const remainingPieces = this._deploySession.getRemainingPieces()
        if (remainingPieces === null) {
          // All pieces deployed! Mark for auto-commit after position update
          shouldAutoCommit = true
        }
      } else if (isFromStackSquare) {
        // Normal move from the stack square: this signals end of deploy sequence
        // The carrier is moving away, completing the deployment
        shouldAutoCommit = true
      }
    }

    // Don't switch turn if there's an active deploy session OR if it's a deploy move
    const hasActiveDeploySession = !!this._deploySession
    const isDeployMoveFlag =
      !isInternalDeployMove(move) &&
      !!(move as InternalMove).flags &&
      !!((move as InternalMove).flags & BITS.DEPLOY)
    const shouldSwitchTurn =
      !isInternalDeployMove(move) &&
      !isDeployMoveFlag &&
      !hasActiveDeploySession

    if (shouldSwitchTurn) {
      this._turn = them // Switch turn only for non-deploy moves when no active session
    }
    // If it was a deploy move or there's an active session, turn remains `us`

    // Update position count for threefold repetition
    this._updatePositionCounts()

    // Auto-commit deploy session AFTER all game state is updated
    if (shouldAutoCommit) {
      try {
        this.commitDeploySession(true) // Switch turn now that deploy is complete
      } catch (error) {
        // Fallback: just clear the session (and legacy state) and switch turn
        this._deploySession = null
        this._deployState = null
        this._turn = them
      }
    }
  }

  private _undoMove(): InternalMove | InternalDeployMove | null {
    const old = this._history.pop()
    if (!old) return null

    const command = old.move // Get the command object

    // Restore general game state BEFORE the command modified the board
    this._commanders = old.commanders
    this._turn = old.turn
    this._halfMoves = old.halfMoves
    this._moveNumber = old.moveNumber
    this._deployState = old.deployState
    this._deploySession = old.deploySession ? old.deploySession.clone() : null

    // Ask the command to revert its specific board changes
    command.undo()

    // Clear moves cache since board state has changed
    this._movesCache.clear()

    return command.move // Return the original InternalMove data
  }

  /**
   * Undoes the last move made on the board, restoring the previous position.
   * Reverts all changes including piece positions, game state, and move counters.
   *
   * If there's an active deploy session, undoes from the session first.
   * Otherwise, undoes from history.
   */
  public undo(): void {
    // Priority 1: Check active deploy session with commands
    if (this._deploySession && this._deploySession.commands.length > 0) {
      const command = this._deploySession.undoLastCommand()
      if (command) {
        command.undo()
      }

      // Clear moves cache since board state has changed
      this._movesCache.clear()

      // If the deploy session is now empty, clear it completely
      if (this._deploySession && this._deploySession.commands.length === 0) {
        this._deploySession = null
        this._deployState = null // Also clear legacy deploy state
      }
      return
    }

    // Priority 2: Check if there's any deploy state (session or legacy) but no commands
    // This means we're in an inconsistent state or all deploy moves have been undone
    if (this._deploySession || this._deployState) {
      // Clear any remaining deploy state - there's nothing to undo
      this._deploySession = null
      this._deployState = null
      return
    }

    // Priority 3: Undo from history (normal moves)
    this._undoMove()
  }

  public getDeployState(): DeployState | null {
    // For backward compatibility, convert session to legacy state
    if (this._deploySession) {
      return this._deploySession.toLegacyDeployState()
    }
    return this._deployState
  }

  public setDeployState(deployState: DeployState | null): void {
    this._deployState = deployState
    // Note: Setting legacy state doesn't create a session (lossy conversion)
    // New code should use setDeploySession() instead
  }

  /**
   * Get the current deploy session (new action-based approach)
   */
  public getDeploySession(): DeploySession | null {
    return this._deploySession
  }

  /**
   * Set the deploy session (new action-based approach)
   */
  public setDeploySession(session: DeploySession | null): void {
    this._deploySession = session
  }

  /**
   * Commit the active deploy session to history
   *
   * The session has already applied moves to the board incrementally.
   * This method just:
   * - Validates session is complete
   * - Clears the session
   * - Switches turn
   * - Updates move counter
   *
   * @returns true if committed successfully
   * @throws Error if no active session or session incomplete
   */
  public commitDeploySession(switchTurn: boolean = true): boolean {
    if (!this._deploySession) {
      throw new Error('No active deploy session to commit')
    }

    if (!this._deploySession.canCommit()) {
      throw new Error('Cannot commit incomplete deploy session')
    }

    // Build InternalDeployMove from session commands
    const stayPiece = this._deploySession.stayPieces
      ? combinePieces(this._deploySession.stayPieces)
      : null

    const internalDeployMove: InternalDeployMove = {
      from: this._deploySession.stackSquare,
      moves: this._deploySession.getActions(), // Get InternalMove[] from commands
      stay: stayPiece !== null ? stayPiece : undefined,
    }

    // Create a simple command wrapper for history
    // We can't use DeployMoveCommand because it validates board state during construction
    // The moves are already applied, so we just need undo functionality
    const commands = this._deploySession.commands
    const deployCommand: CTLMoveCommandInteface = {
      move: internalDeployMove,
      execute: () => {
        // Already executed incrementally, do nothing
      },
      undo: () => {
        // Undo all commands in reverse order
        for (let i = commands.length - 1; i >= 0; i--) {
          commands[i].undo()
        }
      },
    }

    // Add to history NOW (first time for these moves)
    const historyEntry: History = {
      move: deployCommand,
      commanders: {
        r: this._commanders.r,
        b: this._commanders.b,
      },
      turn: this._deploySession.turn,
      halfMoves: this._halfMoves,
      moveNumber: this._moveNumber,
      deployState: null,
      deploySession: null,
    }
    this._history.push(historyEntry)

    // Clear session (and legacy state) and optionally switch turn
    this._deploySession = null
    this._deployState = null // Also clear legacy deploy state

    if (switchTurn) {
      this._turn = swapColor(this._turn)

      if (this._turn === RED) {
        this._moveNumber++
      }
    }

    return true
  }

  /**
   * Cancel the active deploy session
   *
   * Undoes all moves made during the session and clears the session.
   * The board is restored to its state before deployment started.
   *
   * @returns void
   */
  public cancelDeploySession(): void {
    if (!this._deploySession) {
      return // Nothing to cancel
    }

    // Undo all commands in reverse order
    const commands = this._deploySession.commands
    for (let i = commands.length - 1; i >= 0; i--) {
      commands[i].undo()
    }

    // Clear move cache after undoing
    this._movesCache.clear()

    // Clear the session (and legacy state)
    this._deploySession = null
    this._deployState = null
  }

  /**
   * Updates the recorded position of a commander (king) piece for the specified color.
   * This method maintains the internal tracking of commander locations for check detection.
   * @param sq - The new square position in internal 0xf0 coordinate format
   * @param color - The color of the commander whose position is being updated
   */
  public updateCommandersPosition(sq: number, color: Color): void {
    if (this._commanders[color] === -1) return // Commander captured = loss = no need to update
    // Update the king's position
    this._commanders[color] = sq
  }

  /**
   * Retrieves the current square position of the commander (king) for the specified color.
   * Used for check detection and game state evaluation.
   * @param color - The color of the commander to locate
   * @returns The square index in internal coordinates, or -1 if the commander has been captured
   */
  getCommanderSquare(color: Color): number {
    return this._commanders[color]
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
  ): { square: number; type: PieceSymbol }[] {
    const attackers: { square: number; type: PieceSymbol }[] = []
    const isLandPiece = this.get(square)?.type !== NAVY

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

          for (const singlePiece of allPieces) {
            if (singlePiece.color === attackerColor) {
              // Get movement configuration for this piece
              const config = getPieceMovementConfig(
                singlePiece.type,
                singlePiece.heroic ?? false,
              )

              let captureRange = config.captureRange
              if (isLandPiece && config.specialRules?.navyAttackMechanisms) {
                captureRange--
              }
              let airForceCanCapture = true
              if (singlePiece.type === AIR_FORCE) {
                const checkAirDefenseZone = getCheckAirDefenseZone(
                  this,
                  currentSquare,
                  swapColor(attackerColor),
                  getOppositeOffset(offset)!,
                )
                let res = -1
                let i = 0
                while (res < 2 && i < distance) {
                  res = checkAirDefenseZone()
                  i++
                }
                airForceCanCapture = res < 2
              }

              // Check if the piece's range allows it to reach the target
              if (distance <= captureRange) {
                // Check if the piece can attack through blocking pieces
                if (
                  (!pieceBlocking || config.captureIgnoresPieceBlocking) &&
                  (singlePiece.type === AIR_FORCE ? airForceCanCapture : true)
                ) {
                  attackers.push({
                    square: currentSquare,
                    type: singlePiece.type,
                  })
                }
              }
            }
          }
        }

        // Mark that we've encountered a piece in this direction
        pieceBlocking = true
      }
    }

    return attackers
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

  /**
   * Determines whether the current game state constitutes a draw.
   * Checks for all possible draw conditions including fifty-move rule and threefold repetition.
   * @returns True if the game is a draw by any applicable rule, false otherwise
   */
  isDraw(): boolean {
    return this.isDrawByFiftyMoves() || this.isThreefoldRepetition() // Add other draw conditions later (insufficient material)
  }

  /**
   * Determines whether the game has ended due to any terminal condition.
   * Checks for checkmate, draw conditions, or commander capture.
   * @returns True if the game is over by any condition, false if the game can continue
   */
  isGameOver(): boolean {
    // Game over if checkmate, stalemate, draw, or commander captured
    return (
      this.isCheckmate() ||
      this.isDraw() ||
      this._commanders[RED] === -1 ||
      this._commanders[BLUE] === -1
    )
  }

  // --- SAN Parsing/Generation (Updated for Stay Capture & Deploy) ---
  private _moveToSanLan(
    move: InternalMove,
    moves: InternalMove[],
  ): [string, string] {
    const pieceEncoded = makeSanPiece(move.piece)
    const disambiguator = getDisambiguator(move, moves)
    const toAlg = algebraic(move.to) // Target square
    const fromAlg = algebraic(move.from) // Origin square
    let combinationSuffix = '' // Initialize combination suffix
    // const heroicPrefix =
    //   (this.getHeroicStatus(move.from, move.piece.type) ?? false) ? '+' : '' // Simplified: Assume Move class handles this better
    let separator = ''
    if (move.flags & BITS.DEPLOY) {
      separator += '>'
    }
    if (move.flags & BITS.STAY_CAPTURE) {
      separator += '_'
    }
    if (move.flags & BITS.CAPTURE) {
      separator += 'x'
    }
    if (move.flags & BITS.SUICIDE_CAPTURE) {
      separator += '@'
    }
    if (move.flags & BITS.COMBINATION) {
      separator += '&'
      if (!move.combined) {
        throw new Error('Move must have combined for combination')
      }
      const combined = combinePieces([move.piece, move.combined])
      if (!combined) {
        throw new Error(
          'Should have successfully combined pieces in combine move',
        )
      }
      combinationSuffix = makeSanPiece(combined, true)
    }
    let checkingSuffix = '' // Simplified: Assume Move class handles this better

    // Execute move temporarily to check for check/checkmate
    const command = this._executeTemporarily(move)
    // After executing the move, check if opponent is in check/checkmate
    // Note: turn hasn't switched yet, so we check the opponent (them)
    const them = swapColor(move.color)
    const isCheck = this._isCommanderAttacked(them)
    let isCheckmate = false
    if (isCheck) {
      // To check for checkmate, we need to see if opponent has any legal moves
      // Temporarily switch turn to opponent
      const savedTurn = this._turn
      this._turn = them
      isCheckmate = this._moves({ legal: true }).length === 0
      this._turn = savedTurn
    }
    command.undo()
    this._movesCache.clear()

    if (isCheck) {
      checkingSuffix = isCheckmate ? '#' : '^'
    }

    const san = `${pieceEncoded}${disambiguator}${separator}${toAlg}${combinationSuffix}${checkingSuffix}`
    const lan = `${pieceEncoded}${fromAlg}${separator}${toAlg}${combinationSuffix}${checkingSuffix}`

    return [san, lan] // Return both SAN and LAN strings
  }

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
      const [san, lan] = this._moveToSanLan(moves[i], moves)
      if (cleanMove === strippedSan(san) || cleanMove === strippedSan(lan)) {
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
      const [curSan, curLan] = this._moveToSanLan(moves[i], moves)
      if (!from) {
        // if there is no from square, it could be just 'x' missing from a capture
        if (
          cleanMove === strippedSan(curSan).replace(/[x<>+&-]|>x/g, '') ||
          cleanMove === strippedSan(curLan).replace(/[x<>+&-]|>x/g, '')
        ) {
          return moves[i]
        }
        // hand-compare move properties with the results from our permissive regex
      } else if (
        (!pieceType || pieceType.toLowerCase() == moves[i].piece.type) &&
        SQUARE_MAP[from] == moves[i].from &&
        SQUARE_MAP[to] == moves[i].to
      ) {
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
          return moves[i]
        }
      }
    }

    return null
  }

  /**
   * Executes a move on the board, accepting either algebraic notation or move object format.
   * Validates the move legality before execution and updates the game state accordingly.
   * @param move - The move to execute, either as SAN string (e.g., 'Nf3') or move object with from/to squares
   * @param options - Configuration options for move execution
   * @param options.strict - Whether to use strict parsing rules for algebraic notation moves
   * @returns The executed Move object, or null if the move was invalid
   * @throws Error if the move is invalid, illegal, or ambiguous
   */
  move(
    move:
      | string
      | {
          from: string
          to: string
          piece?: PieceSymbol
          stay?: boolean
          deploy?: boolean
        },
    { strict = false }: { strict?: boolean } = {},
  ): Move | null {
    let internalMove: InternalMove | null = null

    // 1. Parse move
    if (typeof move === 'string') {
      internalMove = this._moveFromSan(move, strict)
    } else if (typeof move === 'object') {
      const fromSq = SQUARE_MAP[move.from as Square]
      const toSq = SQUARE_MAP[move.to as Square]

      if (fromSq === undefined || toSq === undefined) {
        throw new Error(
          `Invalid square in move object: ${JSON.stringify(move)}`,
        )
      }

      // Find matching move in legal moves
      const legalMoves = this._moves({
        legal: true,
        square: move.from as Square,
        ...(move.piece && { pieceType: move.piece }),
      })
      const foundMoves: InternalMove[] = []
      for (const m of legalMoves) {
        const isStayMove = (m.flags & BITS.STAY_CAPTURE) !== 0
        const targetSquareInternal = m.to

        const isDeployMove = (m.flags & BITS.DEPLOY) !== 0

        if (
          m.from === fromSq &&
          targetSquareInternal === toSq &&
          (move.piece === undefined || m.piece.type === move.piece) &&
          (move.stay !== undefined ? move.stay === isStayMove : true) &&
          (move.deploy !== undefined ? move.deploy === isDeployMove : true)
        ) {
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

      internalMove = foundMoves[0]
    }

    // 2. Validate move
    if (!internalMove) {
      throw new Error(`Invalid or illegal move: ${JSON.stringify(move)}`)
    }

    const prettyMove = new Move(this, internalMove)

    // 4. Make the move
    this._makeMove(internalMove)

    return prettyMove
  }

  deployMove(deployMove: DeployMoveRequest): DeployMove {
    const sqFrom = SQUARE_MAP[deployMove.from]
    const deployMoves = this._moves({ square: deployMove.from, deploy: true })
    const originalPiece = this._board[sqFrom]

    if (!originalPiece)
      throw new Error('Deploy move error: original piece not found')
    const internalDeployMove = createInternalDeployMove(
      originalPiece,
      deployMove,
      deployMoves,
    )
    const prettyMove = new DeployMove(this, internalDeployMove)
    this._makeMove(internalDeployMove)

    return prettyMove
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
   * @param options - Configuration options for history format
   * @param options.verbose - If true, returns Move/DeployMove objects; if false, returns SAN strings
   * @returns An array containing all moves made in the game, in chronological order
   */
  history(): string[]
  history({ verbose }: { verbose: true }): (Move | DeployMove)[]
  history({ verbose }: { verbose: false }): string[]
  history({ verbose }: { verbose: boolean }): string[] | (Move | DeployMove)[]
  history({ verbose = false }: { verbose?: boolean } = {}) {
    const reversedHistory = []
    const moveHistory = []

    // Undo all moves to collect them in reverse order
    while (this._history.length > 0) {
      reversedHistory.push(this._undoMove())
    }

    // Replay the moves and build the history
    while (true) {
      const move = reversedHistory.pop()
      if (!move) {
        break
      }

      if (verbose) {
        // Check if this is a deploy move or a regular move
        if (isInternalDeployMove(move)) {
          moveHistory.push(new DeployMove(this, move))
        } else {
          moveHistory.push(new Move(this, move))
        }
      } else {
        // For string representation
        if (isInternalDeployMove(move)) {
          const [san] = deployMoveToSanLan(this, move)
          moveHistory.push(san)
        } else {
          moveHistory.push(this._moveToSanLan(move, this._moves())[0])
        }
      }

      // Replay the move
      this._makeMove(move)
    }

    return moveHistory
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
export type { DeployMoveRequest } from './deploy-move.js'
export { DeployMove } from './deploy-move.js'

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
