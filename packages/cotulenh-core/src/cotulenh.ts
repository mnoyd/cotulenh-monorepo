/**
 * @license
 * Adapted from chess.js by Jeff Hlywa (jhlywa@gmail.com)
 * Copyright (c) 2024, Hoang Manh/cotulenh.js
 * All rights reserved.
 */

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
  VALID_PIECE_TYPES,
  NAVY,
  NAVY_MASK,
  LAND_MASK,
} from './type.js'
import {
  getDisambiguator,
  printBoard,
  validateFen,
  validateFenFormat,
  validatePosition,
  handleEmptySquares,
} from './utils.js'
import { generateDeployMoves, generateNormalMoves } from './move-generation.js'
import { createMoveCommand, MoveCommand } from './move-apply.js'

// Structure for storing history states
interface History {
  move: MoveCommand
  kings: Record<Color, number> // Position of commander before the move
  turn: Color
  // castling: Record<Color, number>; // No castling mentioned
  // epSquare: number; // No en passant mentioned
  halfMoves: number // Half move clock before the move
  moveNumber: number // Move number before the move
  // heroicStatus: Record<number, boolean> // Snapshot of heroic status before move <- Removed this line
  deployState: { stackSquare: number; turn: Color } | null // Snapshot of deploy state before move
}

// Public Move class (similar to chess.js) - can be fleshed out later
export class Move {
  color: Color
  from: Square
  to: Square // Destination square (piece's final location)
  piece: Piece
  otherPiece?: Piece
  // promotion?: PieceSymbol; // Not applicable?
  flags: string // String representation of flags
  san?: string // Standard Algebraic Notation (needs implementation)
  lan?: string // Long Algebraic Notation (needs implementation)
  before: string // FEN before move
  after: string // FEN after move
  becameHeroic?: boolean // Did the piece become heroic *on* this move?
  targetSquare?: Square // For stay capture, the square of the captured piece
  isDeploy: boolean // Was this a deploy move from a stack?
  stackBefore?: string // Optional: FEN-like representation of the stack before deploy, e.g., "(NFT)"

  // Constructor needs the main class instance to generate SAN, FENs etc.
  constructor(game: CoTuLenh, internal: InternalMove) {
    const { color, piece, from, to, flags, otherPiece, becameHeroic } = internal

    this.color = color
    this.piece = piece // This is the piece that MOVED (or was deployed)
    this.from = algebraic(from) // Square the move originated from (stack location for deploy)
    this.flags = ''
    for (const flag in BITS) {
      if (BITS[flag] & flags) {
        this.flags += FLAGS[flag]
      }
    }
    if (otherPiece) this.otherPiece = otherPiece
    if (becameHeroic) this.becameHeroic = true
    this.isDeploy = (flags & BITS.DEPLOY) !== 0

    // TODO: Populate this.stackBefore if isDeploy (requires looking at state before move)
    // This is tricky here, better done when generating the verbose history or SAN string
    // this.stackBefore = this.isDeploy ? game.getStackRepresentation(internal.from) : undefined;

    // Determine 'to' square (final location) and 'targetSquare' for display/Move object
    if (flags & BITS.STAY_CAPTURE) {
      // For stay capture (including deploy stay capture), the piece ends up back 'from'
      this.to = algebraic(from)
      this.targetSquare = algebraic(to) // 'to' in internal move holds the target square
    } else {
      // For normal moves/captures (including normal deploy), the piece ends up at 'to'
      this.to = algebraic(to)
    }

    // Store FEN before move - this needs to be set externally by the move() method
    this.before = '' // Will be set by move()
    this.after = '' // Will be set by move()

    this.san = game['_moveToSan'](internal, game['_moves']({ legal: true }))
    this.lan = `${this.from}${algebraic(to)}` // LAN remains simple from-to (destination/target)
  }

  // Add helper methods like isCapture(), isPromotion() etc. if needed
  isCapture(): boolean {
    return this.flags.includes(FLAGS.CAPTURE)
  }

  isStayCapture(): boolean {
    return this.flags.includes(FLAGS.STAY_CAPTURE)
  }
}

// --- CoTuLenh Class (Additions) ---
export class CoTuLenh {
  private _board = new Array<Piece | undefined>(256)
  private _turn: Color = RED // Default to Red
  private _header: Record<string, string> = {}
  private _commanders: Record<Color, number> = { r: -1, b: -1 } // Commander positions
  // private _castling: Record<Color, number> = { r: 0, b: 0 }; // No castling
  // private _epSquare = -1; // No en passant
  private _halfMoves = 0
  private _moveNumber = 1
  private _history: History[] = []
  private _comments: Record<string, string> = {}
  private _positionCount: Record<string, number> = {}
  private _deployState: { stackSquare: number; turn: Color } | null = null // Tracks active deploy phase

  constructor(fen = DEFAULT_POSITION) {
    this.load(fen)
  }

  /**
   * Clears the board and resets the game state
   * @param options - Clear options
   * @param options.preserveHeaders - Whether to preserve existing headers
   */
  clear({ preserveHeaders = false } = {}) {
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

    for (let r = 0; r < 12; r++) {
      this._parseRank(ranks[r], r)
    }
  }

  private _parseRank(rankStr: string, r: number): void {
    let fileIndex = 0
    let currentRankSquares = 0

    for (let i = 0; i < rankStr.length; i++) {
      const char = rankStr.charAt(i)

      if (isDigit(char)) {
        // Handle multi-digit numbers for empty squares
        const { newIndex, emptySquares } = handleEmptySquares(
          rankStr,
          i,
          r,
          fileIndex,
        )
        i = newIndex
        fileIndex += emptySquares
        currentRankSquares += emptySquares
      } else if (char === '(') {
        // Parse stack notation
        const { newIndex } = this._parseStack(rankStr, i, r, fileIndex)
        i = newIndex
        fileIndex++
        currentRankSquares++
      } else {
        // Parse single piece
        const { newIndex } = this._parseSinglePiece(rankStr, i, r, fileIndex)
        i = newIndex
        fileIndex++
        currentRankSquares++
      }
    }

    if (currentRankSquares !== 11) {
      throw new Error(
        `Invalid FEN: rank ${12 - r} does not have 11 squares (${rankStr}, counted ${currentRankSquares})`,
      )
    }
  }

  private _parseStack(
    rankStr: string,
    i: number,
    r: number,
    fileIndex: number,
  ): { newIndex: number } {
    const endParen = rankStr.indexOf(')', i)
    if (endParen === -1) {
      throw new Error(`Invalid FEN: Unmatched parenthesis in rank ${12 - r}`)
    }

    const stackContent = rankStr.substring(i + 1, endParen)
    if (stackContent.length === 0) {
      throw new Error(`Invalid FEN: Empty stack '()' in rank ${12 - r}`)
    }

    let carrierHeroic = false
    let carrierIndex = 0
    if (stackContent[0] === '+') {
      carrierHeroic = true
      carrierIndex = 1
      if (stackContent.length < 2) {
        throw new Error(
          `Invalid FEN: Stack '(+)' missing carrier in rank ${12 - r}`,
        )
      }
    }

    const carrierChar = stackContent[carrierIndex]
    const carrierColor = carrierChar < 'a' ? RED : BLUE
    const carrierType = carrierChar.toLowerCase() as PieceSymbol

    // Validate carrier type
    if (!(carrierType in VALID_PIECE_TYPES)) {
      throw new Error(
        `Invalid FEN: Unknown carrier type '${carrierType}' in stack at rank ${12 - r}`,
      )
    }

    // Parse carried pieces with validation
    const carriedPieces = this._parseCarriedPieces(
      stackContent,
      carrierIndex + 1,
      carrierColor,
      r,
    )

    const sq0x88 = r * 16 + fileIndex
    this._board[sq0x88] = {
      type: carrierType,
      color: carrierColor,
      carrying: carriedPieces.length > 0 ? carriedPieces : undefined,
      heroic: carrierHeroic, // Add heroic status
    }

    if (carrierType === COMMANDER) {
      if (this._commanders[carrierColor] === -1) {
        this._commanders[carrierColor] = sq0x88
      } else {
        throw new Error(
          `Invalid FEN: Multiple commanders found for color ${carrierColor}`,
        )
      }
    }

    return { newIndex: endParen } // Move parser past the closing parenthesis
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

  private _parseCarriedPieces(
    stackContent: string,
    startIndex: number,
    carrierColor: Color,
    r: number,
  ): Piece[] {
    const carriedPieces: Piece[] = []

    for (let j = startIndex; j < stackContent.length; j++) {
      let isHeroic = false
      let currentPieceIndex = j

      // Check for heroic marker '+'
      if (stackContent[currentPieceIndex] === '+') {
        isHeroic = true
        currentPieceIndex++ // Move to the actual piece symbol

        // Check if '+' is the last character in the stack content
        if (currentPieceIndex >= stackContent.length) {
          throw new Error(
            `Invalid FEN: '+' at the end of stack content in rank ${12 - r}`,
          )
        }
        j = currentPieceIndex // Update the main loop index
      }

      const carriedChar = stackContent[currentPieceIndex]
      const carriedColor = carriedChar < 'a' ? RED : BLUE
      const carriedType = carriedChar.toLowerCase() as PieceSymbol

      // Validate carried piece type
      if (!(carriedType in VALID_PIECE_TYPES)) {
        throw new Error(
          `Invalid FEN: Unknown carried piece type '${carriedType}' in stack at rank ${12 - r}`,
        )
      }

      // Validate color match
      if (carriedColor !== carrierColor) {
        throw new Error(
          `Invalid FEN: Carried piece color mismatch in stack at rank ${12 - r}`,
        )
      }

      // Add the piece with its heroic status
      carriedPieces.push({
        type: carriedType,
        color: carriedColor,
        heroic: isHeroic,
      })
    }

    return carriedPieces
  }

  private _parseSinglePiece(
    rankStr: string,
    i: number,
    r: number,
    fileIndex: number,
  ): { newIndex: number } {
    let isHeroic = false
    let currentIndex = i

    if (rankStr.charAt(currentIndex) === '+') {
      isHeroic = true
      currentIndex++

      if (currentIndex >= rankStr.length) {
        throw new Error(
          `Invalid FEN: '+' at the end of rank ${12 - r} without a piece`,
        )
      }
    }

    const pieceChar = rankStr.charAt(currentIndex)
    const color = pieceChar < 'a' ? RED : BLUE
    const type = pieceChar.toLowerCase() as PieceSymbol

    // Validate piece type
    if (!(type in VALID_PIECE_TYPES) && type !== HEADQUARTER) {
      throw new Error(
        `Invalid FEN: Unknown piece type '${type}' in rank ${12 - r}`,
      )
    }

    const sq0x88 = r * 16 + fileIndex
    this._board[sq0x88] = { type, color, heroic: isHeroic }

    if (type === COMMANDER) {
      // Track Commander position
      if (this._commanders[color] === -1) {
        this._commanders[color] = sq0x88
      } else {
        throw new Error(
          `Invalid FEN: Multiple commanders found for color ${color}`,
        )
      }
    }

    return { newIndex: currentIndex }
  }

  /**
   * Generates a FEN string representing the current position
   * @returns The FEN string
   */
  fen(): string {
    let empty = 0
    let fen = ''
    for (let r = 0; r < 12; r++) {
      empty = 0
      for (let f = 0; f < 11; f++) {
        const sq = r * 16 + f
        const piece = this._board[sq]
        if (piece) {
          if (empty > 0) {
            fen += empty
            empty = 0
          }

          // Check if it's a stack
          if (piece.carrying && piece.carrying.length > 0) {
            // Format stack: (CP1P2...) or +(CP1P2...)
            let stackStr =
              piece.color === RED
                ? piece.type.toUpperCase()
                : piece.type.toLowerCase()
            // Sort carrying pieces alphabetically for consistent FEN? Or keep original order? Let's sort.
            const carriedSorted = [...piece.carrying].sort((a, b) =>
              a.type.localeCompare(b.type),
            )
            stackStr += carriedSorted
              .map((p) =>
                p.color === RED ? p.type.toUpperCase() : p.type.toLowerCase(),
              )
              .join('')
            stackStr = `(${stackStr})`
            if (piece.heroic) {
              stackStr = '+' + stackStr
            }
            fen += stackStr
          } else {
            // Single piece
            let char =
              piece.color === RED
                ? piece.type.toUpperCase()
                : piece.type.toLowerCase()
            // Add heroic marker with '+' prefix
            if (piece.heroic) {
              char = '+' + char
            }
            fen += char
          }
        } else {
          empty++
        }
      }
      if (empty > 0) {
        fen += empty
      }
      if (r < 11) {
        fen += '/'
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
  ): boolean {
    if (!(square in SQUARE_MAP)) return false
    const sq = SQUARE_MAP[square]

    //Piece should be put on correct relative terrain.
    if (type === NAVY) {
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
    this._board[sq] = {
      type,
      color,
      carrying: carrying?.length ? carrying : undefined,
      heroic: heroic ?? false, // Default to false if undefined
    }
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
  private _moves({
    legal = true,
    piece: filterPiece = undefined,
    square: filterSquare = undefined,
    ignoreSafety = false,
  }: {
    legal?: boolean
    piece?: PieceSymbol
    square?: Square
    ignoreSafety?: boolean
  } = {}): InternalMove[] {
    const us = this.turn()
    let allMoves: InternalMove[] = []

    // Generate moves based on game state
    if (this._deployState && this._deployState.turn === us) {
      allMoves = generateDeployMoves(
        this,
        this._deployState.stackSquare,
        filterPiece,
      )
    } else {
      allMoves = generateNormalMoves(this, us, filterPiece, filterSquare)
    }

    // Filter illegal moves (leaving commander in check)
    if (legal && !ignoreSafety) {
      return this._filterLegalMoves(allMoves, us)
    }

    return allMoves
  }
  // Helper method to filter legal moves
  private _filterLegalMoves(moves: InternalMove[], us: Color): InternalMove[] {
    const legalMoves: InternalMove[] = []
    for (const move of moves) {
      this._makeMove(move)
      if (!this._isCommanderAttacked(us)) {
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
    piece = undefined,
    ignoreSafety = false,
  }: {
    verbose?: boolean
    square?: Square
    piece?: PieceSymbol
    ignoreSafety?: boolean
  } = {}): string[] | Move[] {
    const internalMoves = this._moves({
      square,
      piece,
      legal: true,
      ignoreSafety,
    }) // Generate legal moves

    if (verbose) {
      // Map to Move objects, passing current heroic status
      return internalMoves.map((move) => new Move(this, move))
    } else {
      // Generate SAN strings (needs proper implementation)
      // Pass all legal moves for ambiguity resolution
      const allLegalMoves = this._moves({ legal: true, ignoreSafety })
      return internalMoves.map((move) => this._moveToSan(move, allLegalMoves))
    }
  }

  // --- Move Execution/Undo (Updated for Stay Capture & Deploy) ---
  private _makeMove(move: InternalMove) {
    const us = this.turn()
    const them = swapColor(us)

    // 1. Create the command object for this move
    const moveCommand = createMoveCommand(this, move)

    // 2. Store pre-move state and the command in history
    const historyEntry: History = {
      move: moveCommand,
      kings: { ...this._commanders },
      turn: us,
      halfMoves: this._halfMoves,
      moveNumber: this._moveNumber,
      deployState: this._deployState, // Snapshot deploy state *before* this move
    }
    this._history.push(historyEntry)

    // 3. Execute the command
    try {
      moveCommand.execute()
    } catch (error) {
      // Revert the history entry on error
      this._history.pop()
      throw error
    }

    // --- 4. Update General Game State AFTER command execution ---

    // Reset half moves counter if capture occurred OR commander moved
    if (moveCommand.move.otherPiece) {
      this._halfMoves = 0
    } else {
      this._halfMoves++
    }

    // Increment move number if Blue moved
    if (us === BLUE && !(move.flags & BITS.DEPLOY)) {
      // Only increment if not a deploy move by blue
      this._moveNumber++
    }

    // --- Handle Promotion ---
    // Check if this move grants heroic status
    let becameHeroic = false
    // Use finalSq determined above
    const pieceAtFinalSq = this._board[moveCommand.move.to] // Get the piece that ended up there

    // Check for promotion conditions (e.g., putting opponent in check)
    // AND ensure the piece is not a Commander
    if (pieceAtFinalSq && pieceAtFinalSq.type !== COMMANDER) {
      // Temporarily switch turn to check opponent's king
      this._turn = them
      if (this._isCommanderAttacked(them)) {
        // If the move puts opponent in check
        if (!pieceAtFinalSq.heroic) {
          // And the piece wasn't already heroic
          pieceAtFinalSq.heroic = true
          becameHeroic = true
        }
      }
      this._turn = us // Switch back
    }
    // TODO: Check for last piece auto-promotion (also needs Commander check)

    // Update the move object in history if promotion occurred
    if (becameHeroic) {
      moveCommand.move.becameHeroic = true // Modify the move object directly (part of history)
      moveCommand.move.flags |= BITS.HEROIC_PROMOTION
    }

    // --- Switch Turn (or maintain for deploy) ---
    if (!(move.flags & BITS.DEPLOY)) {
      this._turn = them // Switch turn only for non-deploy moves
    }
    // If it was a deploy move, turn remains `us`

    // Update position count for threefold repetition
    this._updatePositionCounts()
  }

  private _undoMove(): InternalMove | null {
    const old = this._history.pop()
    if (!old) return null

    const command = old.move // Get the command object

    // Restore general game state BEFORE the command modified the board
    this._commanders = old.kings
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
   * Gets a piece at a square using internal 0x88 coordinates
   * @param square - The square in 0x88 format
   * @returns The piece at the square, or undefined if no piece is found
   */
  public getPieceAt(square: number): Piece | undefined {
    return this._board[square]
  }
  /**
   * Deletes a piece at a square using internal 0x88 coordinates
   * @param square - The square in 0x88 format
   */
  public deletePieceAt(square: number): void {
    delete this._board[square]
  }
  /**
   * Sets a piece at a square using internal 0x88 coordinates
   * @param square - The square in 0x88 format
   * @param piece - The piece to place
   */
  public setPieceAt(square: number, piece: Piece): void {
    this._board[square] = piece
  }

  /**
   * Updates the position of a commander
   * @param sq - The new square in 0x88 format
   * @param color - The color of the commander
   */
  public updateKingsPosition(sq: number, color: Color): void {
    if (this._commanders[color] === -1) return // Commander captured = loss = no need to update
    // Update the king's position
    this._commanders[color] = sq
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
      if (move.flags & BITS.CAPTURE && move.to === kingSq) {
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
  private _moveToSan(move: InternalMove, moves: InternalMove[]): string {
    const pieceChar = move.piece.type.toUpperCase()
    const disambiguator = getDisambiguator(move, moves)
    const toAlg = algebraic(move.to) // Target square
    const heroicPrefix =
      (this.getHeroicStatus(move.from, move.piece.type) ?? false) ? '+' : '' // Simplified: Assume Move class handles this better
    const heroicSuffix = move.becameHeroic ? '^' : ''
    let separator = ''
    if (move.flags & BITS.DEPLOY) {
      separator += '>'
    }
    if (move.flags & BITS.STAY_CAPTURE) {
      separator += '<'
    }
    if (move.flags & BITS.CAPTURE) {
      separator += 'x'
    }

    const san = `${heroicPrefix}${pieceChar}${disambiguator}${separator}${toAlg}${heroicSuffix}`

    // TODO: Add check/mate symbols (+/#) by temporarily making move and checking state

    return san // Return the generated SAN string
  }

  private _moveFromSan(move: string, strict = false): InternalMove | null {
    // Strip extras like check/mate symbols, heroic markers for basic parsing
    const cleanMove = move.replace(/[+#*?!]/g, '')

    // Regex to handle different formats:
    // 1. Normal: Pf1-f3, Pf1xf3
    // 2. Stay Capture: Pf1<f3
    // 3. Deploy: (Stack)Pf1>f3, (Stack)Pf1>xf3
    // 4. Deploy Stay Capture: (Stack)Pf1<f3
    const deployStackRegex =
      /^(\(\?*\))?([CIITMEAGSFNH])([a-k](?:1[0-2]|[1-9]))([>x<])([a-k](?:1[0-2]|[1-9]))$/i
    const normalMoveRegex =
      /^([CIITMEAGSFNH])?([a-k](?:1[0-2]|[1-9]))([x<-])([a-k](?:1[0-2]|[1-9]))$/i
    // Note: Ambiguity resolution (e.g., Nbf1 vs Ndf1) is NOT handled here yet.

    let parsed: {
      stack?: string
      piece?: PieceSymbol
      from: Square
      separator: string
      to: Square
    } | null = null

    const deployMatch = cleanMove.match(deployStackRegex)
    if (deployMatch) {
      parsed = {
        stack: deployMatch[1], // Optional stack representation (currently ignored)
        piece: deployMatch[2].toLowerCase() as PieceSymbol,
        from: deployMatch[3] as Square,
        separator: deployMatch[4], // '>', '>x', '<'
        to: deployMatch[5] as Square,
      }
    } else {
      const normalMatch = cleanMove.match(normalMoveRegex)
      if (normalMatch) {
        parsed = {
          piece: (normalMatch[1] || '').toLowerCase() as PieceSymbol, // Piece type might be missing for pawns/infantry
          from: normalMatch[2] as Square,
          separator: normalMatch[3], // '-', 'x', '<'
          to: normalMatch[4] as Square,
        }
      }
    }

    if (!parsed) {
      return null // Could not parse
    }

    const fromSq = SQUARE_MAP[parsed.from]
    const toSq = SQUARE_MAP[parsed.to] // Destination or Target square
    if (fromSq === undefined || toSq === undefined) return null

    // Determine expected flags based on separator
    let expectedFlags = 0
    let isDeploy = false
    if (parsed.separator === '>' || parsed.separator === '>x') {
      expectedFlags =
        BITS.DEPLOY | (parsed.separator === '>x' ? BITS.CAPTURE : 0)
      isDeploy = true
    } else if (parsed.separator === '<') {
      expectedFlags = BITS.STAY_CAPTURE | BITS.CAPTURE // Stay capture always implies capture
      isDeploy = !!parsed.stack // Check if stack prefix exists
      if (isDeploy) expectedFlags |= BITS.DEPLOY
    } else if (parsed.separator === 'x') {
      expectedFlags = BITS.CAPTURE
    } else {
      expectedFlags = BITS.NORMAL
    }

    // Find the matching move among legal moves for the source square
    const candidateMoves = this._moves({
      legal: true,
      square: parsed.from, // Filter by starting square
    })

    for (const m of candidateMoves) {
      // Check piece type (must match if provided in SAN, especially for deploy)
      if (parsed.piece && m.piece.type !== parsed.piece) continue

      // Check flags match the parsed separator type
      const isMoveDeploy = (m.flags & BITS.DEPLOY) !== 0
      const isMoveStayCapture = (m.flags & BITS.STAY_CAPTURE) !== 0
      const isMoveNormalCapture =
        (m.flags & BITS.CAPTURE) !== 0 && !isMoveStayCapture
      const isMoveNormal = !(
        m.flags &
        (BITS.CAPTURE | BITS.DEPLOY | BITS.STAY_CAPTURE)
      )

      if (isDeploy && isMoveDeploy) {
        if (isMoveStayCapture && parsed.separator === '<' && m.to === toSq)
          return m // Deploy Stay Capture
        if (
          !isMoveStayCapture &&
          (parsed.separator === '>' || parsed.separator === '>x') &&
          m.to === toSq
        ) {
          // Check capture flag consistency
          if ((parsed.separator === '>x') === ((m.flags & BITS.CAPTURE) !== 0))
            return m // Deploy Normal/Capture
        }
      } else if (!isDeploy && !isMoveDeploy) {
        if (isMoveStayCapture && parsed.separator === '<' && m.to === toSq)
          return m // Normal Stay Capture
        if (isMoveNormalCapture && parsed.separator === 'x' && m.to === toSq)
          return m // Normal Capture
        if (isMoveNormal && parsed.separator === '-' && m.to === toSq) return m // Normal Move
      }
    }

    return null // No matching legal move found
  }

  // Public move method using SAN or object (Updated for Stay Capture)
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
          stay?: boolean /* promotion?: string */
          piece?: PieceSymbol
        },
    { strict = false }: { strict?: boolean } = {},
  ): Move | null {
    let internalMove: InternalMove | null = null

    if (typeof move === 'string') {
      internalMove = this._moveFromSan(move, strict)
    } else if (typeof move === 'object') {
      const fromSq = SQUARE_MAP[move.from as Square]
      const toSq = SQUARE_MAP[move.to as Square] // Target or Destination square
      const requestedStay = move.stay === true

      if (fromSq === undefined || toSq === undefined) {
        throw new Error(
          `Invalid square in move object: ${JSON.stringify(move)}`,
        )
      }

      // Find matching move in legal moves
      const legalMoves = this._moves({
        legal: true,
        square: move.from as Square,
      })

      for (const m of legalMoves) {
        const isStayMove = (m.flags & BITS.STAY_CAPTURE) !== 0
        const targetSquareInternal = m.to // Internal 'to' is always the target/destination

        if (
          targetSquareInternal === toSq &&
          (move.piece ? move.piece === m.piece.type : true)
        ) {
          // Check if stay preference matches
          if (requestedStay && isStayMove) {
            internalMove = m
            break
          } else if (!requestedStay && !isStayMove) {
            internalMove = m
            break
          }
          // If stay preference doesn't match, but target is correct, keep searching
          // (e.g., Air Force might have both stay and replace options to the same target)
          // If only one option exists, we might select it even if stay preference mismatches?
          // For now, require exact match including stay flag if specified.
        }
      }
      // Fallback: If exact stay match failed, but only one move targets the square, take it?
      if (!internalMove) {
        const possibleMoves = legalMoves.filter((m) => m.to === toSq)
        if (possibleMoves.length === 1) {
          // Check if the single option is a capture if the object implies one (e.g. piece on target)
          const targetPiece = this.get(move.to as Square)
          if (targetPiece && targetPiece.color === swapColor(this.turn())) {
            if (possibleMoves[0].flags & BITS.CAPTURE) {
              internalMove = possibleMoves[0]
            }
          } else if (!targetPiece) {
            // Moving to empty square
            internalMove = possibleMoves[0]
          }
        }
      }
    }

    if (!internalMove) {
      // Try generating moves without specifying square/piece if initial parse failed (for SAN string)
      if (typeof move === 'string') {
        const allLegalMoves = this._moves({ legal: true })
        for (const m of allLegalMoves) {
          // Check if SAN matches (requires better _moveToSan)
          if (this._moveToSan(m, allLegalMoves) === move) {
            internalMove = m
            break
          }
        }
      }
      if (!internalMove) {
        // Still not found
        throw new Error(`Invalid or illegal move: ${JSON.stringify(move)}`)
      }
    }

    this._makeMove(internalMove)

    // Create Move object *after* making the move to get correct 'after' FEN and 'becameHeroic' status
    // Need to re-fetch the move from history to get the potentially updated 'becameHeroic' flag
    const savedMove = this._history[this._history.length - 1].move
    const fenBeforeMove =
      this._history[this._history.length - 1].turn === RED &&
      this._history.length > 1
        ? new CoTuLenh(this.fen()).fen() // FEN after previous move
        : DEFAULT_POSITION // Or default if it's the first move
    // A more reliable way might be to store the FEN in the history entry itself

    const prettyMove = new Move(this, savedMove.move)

    // Manually set FENs on the prettyMove object
    prettyMove.before = fenBeforeMove // FEN before this move
    prettyMove.after = this.fen() // Current FEN after the move

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
  history(): string[]
  history({ verbose }: { verbose: true }): Move[]
  history({ verbose }: { verbose: false }): string[]
  history({ verbose }: { verbose: boolean }): string[] | Move[]
  history({ verbose = false }: { verbose?: boolean } = {}) {
    const reversedHistory = []
    const moveHistory = []

    while (this._history.length > 0) {
      reversedHistory.push(this._undoMove())
    }

    while (true) {
      const move = reversedHistory.pop()
      if (!move) {
        break
      }

      if (verbose) {
        moveHistory.push(new Move(this, move))
      } else {
        moveHistory.push(this._moveToSan(move, this._moves()))
      }
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
