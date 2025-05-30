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
  COMMANDER,
  HEADQUARTER,
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
} from './type.js'
import {
  getDisambiguator,
  printBoard,
  validateFen,
  handleEmptySquares,
  makeSanPiece,
  createCombinedPiece,
  strippedSan,
  inferPieceType,
  createCombineStackFromPieces,
  flattenPiece,
} from './utils.js'
import {
  generateDeployMoves,
  generateNormalMoves,
  ORTHOGONAL_OFFSETS,
  ALL_OFFSETS,
  getPieceMovementConfig,
} from './move-generation.js'
import {
  createMoveCommand,
  DeployMoveCommand,
  MoveCommandInteface,
} from './move-apply.js'
import {
  createInternalDeployMove,
  DeployMove,
  DeployMoveRequest,
  deployMoveToSanLan,
  InternalDeployMove,
  isInternalDeployMove,
} from './deploy-move.js'

// Structure for storing history states
interface History {
  move: MoveCommandInteface
  commanders: Record<Color, number> // Position of commander before the move
  turn: Color
  halfMoves: number // Half move clock before the move
  moveNumber: number // Move number before the move
  deployState: DeployState | null // Snapshot of deploy state before move
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
    game['_makeMove'](internal)
    this.after = game.fen()
    game['_undoMove']()

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
  private _deployState: DeployState | null = null // Tracks active deploy phase

  constructor(fen = DEFAULT_POSITION) {
    this.load(fen)
  }

  /**
   * Clears the board and resets the game state
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
    delete this._header['SetUp']
    delete this._header['FEN']
  }

  /**
   * Loads a game position from a FEN string
   * @param fen - The FEN string to load
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
      validateFen(fen)
    }

    // Parse board position
    this._parseBoardPosition(position)

    // Parse game state
    this._turn = (tokens[1] as Color) || RED
    this._halfMoves = parseInt(tokens[4], 10) || 0
    this._moveNumber = parseInt(tokens[5], 10) || 1

    // Update position counts and setup flags
    this._updatePositionCounts()
  }

  private _parseBoardPosition(position: string): void {
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
   * Generates a FEN string representing the current position
   * @returns The FEN string
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

    return [
      fen,
      this._turn,
      castling,
      epSquare,
      this._halfMoves,
      this._moveNumber,
    ].join(' ')
  }

  /**
   * Gets a piece at a square, optionally specifying a piece type to find in a stack
   * @param square - The square to check
   * @param pieceType - Optional piece type to find in a stack
   * @returns The piece at the square, or undefined if no piece is found
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
   * Places a piece on the board
   * @param piece - The piece to place
   * @param piece.type - The type of piece
   * @param piece.color - The color of the piece
   * @param piece.heroic - Whether the piece is heroic
   * @param piece.carrying - Optional pieces being carried by this piece
   * @param square - The square to place the piece on
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
    this._movesCache.clear()
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
        const { combined: combinedPiece, uncombined } =
          createCombineStackFromPieces(allPieces)
        if (!combinedPiece || (uncombined?.length ?? 0) > 0) {
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
      type === COMMANDER &&
      this._commanders[color] !== -1 &&
      this._commanders[color] !== sq
    ) {
      return false
    }

    const currentPiece = this._board[sq]
    if (
      currentPiece &&
      currentPiece.type === COMMANDER &&
      this._commanders[currentPiece.color] === sq
    ) {
      this._commanders[currentPiece.color] = -1
    }

    // Place the piece or stack
    this._board[sq] = newPiece
    if (type === COMMANDER) this._commanders[color] = sq

    // TODO: Update setup, etc.
    return true
  }

  /**
   * Removes a piece from the board
   * @param square - The square to remove the piece from
   * @returns The removed piece, or undefined if no piece was at the square
   */
  remove(square: Square): Piece | undefined {
    this._movesCache.clear()
    if (!(square in SQUARE_MAP)) return undefined
    const sq = SQUARE_MAP[square]
    const piece = this._board[sq]
    const wasHeroic = piece?.heroic

    if (!piece) return undefined

    delete this._board[sq]

    if (piece.type === COMMANDER && this._commanders[piece.color] === sq) {
      this._commanders[piece.color] = -1
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
    if ((this._deployState && this._deployState.turn === us) || deploy) {
      let deployFilterSquare: number
      if (deploy) {
        deployFilterSquare = SQUARE_MAP[filterSquare!]
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
      result = this._filterLegalMoves(allMoves, us)
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
  private _filterLegalMoves(moves: InternalMove[], us: Color): InternalMove[] {
    const legalMoves: InternalMove[] = []
    for (const move of moves) {
      this._makeMove(move)
      // A move is legal if it doesn't leave the commander attacked AND doesn't expose the commander
      if (!this._isCommanderAttacked(us) && !this._isCommanderExposed(us)) {
        legalMoves.push(move)
      }
      this._undoMove()
    }
    return legalMoves
  }

  // Public moves method (formats output)
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
  private _makeMove(move: InternalMove | InternalDeployMove) {
    const us = this.turn()
    const them = swapColor(us)

    // 1. Create the command object for this move
    let moveCommand: MoveCommandInteface
    if (isInternalDeployMove(move)) {
      moveCommand = new DeployMoveCommand(this, move)
    } else {
      moveCommand = createMoveCommand(this, move)
    }

    // Store pre-move state
    const preCommanderState = { ...this._commanders }
    const preTurn = us
    const preHalfMoves = this._halfMoves
    const preMoveNumber = this._moveNumber
    const preDeployState = this._deployState

    // 2. Execute the command
    try {
      moveCommand.execute()
    } catch (error) {
      throw error
    }

    // 3. Store post-execution command and pre-move state in history
    const historyEntry: History = {
      move: moveCommand, // Now contains updated heroicActions
      commanders: preCommanderState,
      turn: preTurn,
      halfMoves: preHalfMoves,
      moveNumber: preMoveNumber,
      deployState: preDeployState,
    }
    this._history.push(historyEntry)

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
    // // TODO: Check for last piece auto-promotion (also needs Commander check)

    // --- Switch Turn (or maintain for deploy) ---
    if (!isInternalDeployMove(move) && !(move.flags & BITS.DEPLOY)) {
      this._turn = them // Switch turn only for non-deploy moves
    }
    // If it was a deploy move, turn remains `us`

    // Update position count for threefold repetition
    this._updatePositionCounts()
  }

  private _undoMove(): InternalMove | InternalDeployMove | null {
    // this._movesCache.clear()
    const old = this._history.pop()
    if (!old) return null

    const command = old.move // Get the command object

    // Restore general game state BEFORE the command modified the board
    this._commanders = old.commanders
    this._turn = old.turn
    this._halfMoves = old.halfMoves
    this._moveNumber = old.moveNumber
    this._deployState = old.deployState

    // Ask the command to revert its specific board changes
    command.undo()

    // (Optional: Decrement position count)

    return command.move // Return the original InternalMove data
  }

  /**
   * Undoes the last move
   */
  public undo(): void {
    this._undoMove()
  }
  /**
   * Gets a piece at a square using internal 0xf0 coordinates
   * @param square - The square in 0xf0 format
   * @returns The piece at the square, or undefined if no piece is found
   */
  public getPieceAt(square: number): Piece | undefined {
    return this._board[square]
  }
  /**
   * Deletes a piece at a square using internal 0xf0 coordinates
   * @param square - The square in 0xf0 format
   */
  public deletePieceAt(square: number): void {
    delete this._board[square]
  }
  /**
   * Sets a piece at a square using internal 0xf0 coordinates
   * @param square - The square in 0xf0 format
   * @param piece - The piece to place
   */
  public setPieceAt(square: number, piece: Piece): void {
    this._board[square] = piece
  }

  public getDeployState(): DeployState | null {
    return this._deployState
  }

  public setDeployState(deployState: DeployState | null): void {
    this._deployState = deployState
  }

  /**
   * Updates the position of a commander
   * @param sq - The new square in 0xf0 format
   * @param color - The color of the commander
   */
  public updateKingsPosition(sq: number, color: Color): void {
    if (this._commanders[color] === -1) return // Commander captured = loss = no need to update
    // Update the king's position
    this._commanders[color] = sq
  }

  /**
   * Gets the square index of the commander for a given color
   * @param color - The color of the commander
   * @returns The square index of the commander, or -1 if not on board
   */
  getCommanderSquare(color: Color): number {
    return this._commanders[color]
  }

  /**
   * Gets all pieces of a specific color that are attacking a given square
   * @param square - The square to check for attackers
   * @param attackerColor - The color of the potential attackers
   * @returns An array of objects containing the square and type of pieces that attack the given square
   */
  getAttackers(
    square: number,
    attackerColor: Color,
  ): { square: number; type: PieceSymbol }[] {
    const attackers: { square: number; type: PieceSymbol }[] = []
    const isLandPiece = this.getPieceAt(square)?.type !== NAVY

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

        // Check if the main piece at this square can attack the target
        if (piece.color === attackerColor) {
          // Get movement configuration for this piece
          const config = getPieceMovementConfig(
            piece.type,
            piece.heroic ?? false,
          )
          if (isLandPiece && config.specialRules?.navyAttackMechanisms) {
            config.captureRange = 3
          }

          // Check if the piece's range allows it to reach the target
          if (distance <= config.captureRange) {
            // Check if the piece can attack through blocking pieces
            if (!pieceBlocking || config.captureIgnoresPieceBlocking) {
              attackers.push({ square: currentSquare, type: piece.type })
            }
          }

          // Check carried pieces in stacks
          if (piece.carrying && piece.carrying.length > 0) {
            for (const carriedPiece of piece.carrying) {
              if (carriedPiece.color === attackerColor) {
                // Get movement configuration for the carried piece
                const carriedConfig = getPieceMovementConfig(
                  carriedPiece.type,
                  carriedPiece.heroic ?? false,
                )

                // Check if the carried piece's range allows it to reach the target
                if (distance <= carriedConfig.captureRange) {
                  // Check if the carried piece can attack through blocking pieces
                  if (
                    !pieceBlocking ||
                    carriedConfig.captureIgnoresPieceBlocking
                  ) {
                    attackers.push({
                      square: currentSquare,
                      type: carriedPiece.type,
                    })
                  }
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

    // Generate all opponent's pseudo-legal moves
    const opponent = swapColor(color)
    const originalTurn = this._turn
    this._turn = opponent // Temporarily switch turn
    const opponentMoves = this._moves({ legal: false }) // Generate for opponent
    this._turn = originalTurn // Switch back

    for (const move of opponentMoves) {
      // Check if any move targets the king square
      // For stay capture, the target is move.to; for normal capture, it's also move.to
      if (
        move.flags & (BITS.CAPTURE | BITS.STAY_CAPTURE) &&
        move.to === kingSq
      ) {
        return true // Commander is attacked
      }
    }
    return false
  }

  /**
   * Determines if the current player is in check
   * @returns True if the current player is in check, false otherwise
   */
  isCheck(): boolean {
    return this._isCommanderAttacked(this._turn)
  }

  /**
   * Determines if the current player is in checkmate
   * @returns True if the current player is in checkmate, false otherwise
   */
  isCheckmate(): boolean {
    // Checkmate = Commander is attacked AND no legal moves exist
    return this.isCheck() && this._moves({ legal: true }).length === 0
  }

  // TODO: Implement isInsufficientMaterial, isThreefoldRepetition, isDrawByFiftyMoves based on variant rules
  /**
   * Determines if the game is a draw by the fifty-move rule
   * @returns True if the game is a draw by the fifty-move rule, false otherwise
   */
  isDrawByFiftyMoves(): boolean {
    return this._halfMoves >= 100 // 50 moves per side
  }

  /**
   * Determines if the game is a draw by threefold repetition
   * @returns True if the game is a draw by threefold repetition, false otherwise
   */
  isThreefoldRepetition(): boolean {
    return this._positionCount[this.fen()] >= 3
  }

  /**
   * Determines if the game is a draw
   * @returns True if the game is a draw, false otherwise
   */
  isDraw(): boolean {
    return this.isDrawByFiftyMoves() || this.isThreefoldRepetition() // Add other draw conditions later (insufficient material)
  }

  /**
   * Determines if the game is over
   * @returns True if the game is over, false otherwise
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
    if (move.flags & BITS.COMBINATION) {
      separator += '&'
      if (!move.combined) {
        throw new Error('Move must have combined for combination')
      }
      const combined = createCombinedPiece(move.piece, move.combined)
      if (!combined) {
        throw new Error(
          'Should have successfully combined pieces in combine move',
        )
      }
      combinationSuffix = makeSanPiece(combined, true)
    }
    let checkingSuffix = '' // Simplified: Assume Move class handles this better

    this._makeMove(move)
    if (this.isCheck()) {
      if (this.isCheckmate()) {
        checkingSuffix = '#'
      } else {
        checkingSuffix = '^'
      }
    }
    this._undoMove()

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
   * Makes a move on the board
   * @param move - The move to make, either in SAN format or as an object
   * @param options - Move options
   * @param options.strict - Whether to use strict parsing for SAN moves
   * @returns The move that was made, or null if the move was invalid
   * @throws Error if the move is invalid or illegal
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
   * Gets the color of the player whose turn it is
   * @returns The color of the player whose turn it is
   */
  turn(): Color {
    return this._turn
  }

  // ... (board, squareColor, history, comments, moveNumber need review/adaptation) ...
  /**
   * Gets a representation of the board
   * @returns A 2D array representing the board, with each element being a piece or null
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
   * Gets the move history
   * @param options - History options
   * @param options.verbose - Whether to return detailed move objects
   * @returns An array of moves, either as strings or Move objects
   */
  /**
   * Returns a list of all moves made in the game
   * @param options - History options
   * @param options.verbose - Whether to return detailed move objects
   * @returns An array of moves, either as strings or Move objects
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
   * Gets the heroic status of a piece at a square
   * @param square - The square to check
   * @param pieceType - Optional piece type to find in a stack
   * @returns True if the piece is heroic, false otherwise
   */
  getHeroicStatus(square: Square | number, pieceType?: PieceSymbol): boolean {
    const piece = this.get(square, pieceType)
    return piece?.heroic ?? false
  }

  /**
   * Set the heroic status of a piece at a square
   * @param square - The square to check
   * @param pieceType - Optional piece type to find in a stack
   * @param heroic - The heroic status to set
   * @returns True if the heroic status was successfully set, false otherwise
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
   * Gets the current move number
   * @returns The current move number
   */
  moveNumber(): number {
    return this._moveNumber
  }

  /**
   * Gets the comment for the current position
   * @returns The comment for the current position, or undefined if no comment exists
   */
  getComment(): string | undefined {
    return this._comments[this.fen()]
  }
  /**
   * Sets a comment for the current position
   * @param comment - The comment to set
   */
  setComment(comment: string) {
    this._comments[this.fen()] = comment
  }
  /**
   * Removes the comment for the current position
   * @returns The removed comment, or undefined if no comment existed
   */
  removeComment(): string | undefined {
    const comment = this._comments[this.fen()]
    delete this._comments[this.fen()]
    return comment
  }
  // Removed printTerrainZones

  /**
   * Prints a text representation of the board to the console
   */
  printBoard(): void {
    printBoard(this._board)
  }

  // TODO: getComments, removeComments need pruning logic like chess.js if history is mutable
}

export * from './type.js'
export { DeployMoveRequest, DeployMove } from './deploy-move.js'
export { getCoreTypeFromRole, getRoleFromCoreType } from './utils.js'

/**
 * Validates a FEN string
 * @param fen - The FEN string to validate
 * @returns true if the FEN is valid, false otherwise
 */
export function validateFenString(fen: string): boolean {
  try {
    validateFen(fen)
    return true
  } catch (e) {
    return false
  }
}
