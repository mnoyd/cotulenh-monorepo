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
} from './type.js'
import { getDisambiguator, printBoard } from './utils.js'
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
  piece: PieceSymbol
  captured?: PieceSymbol
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
    const { color, piece, from, to, flags, captured, becameHeroic } = internal

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

  // FEN loading - updated for colors, needs heroic status parsing if added to FEN
  load(fen: string, { skipValidation = false, preserveHeaders = false } = {}) {
    // TODO: Add FEN validation based on rules
    const tokens = fen.split(/\s+/)
    const position = tokens[0]

    this.clear({ preserveHeaders })

    // TODO: Parse heroic status from FEN if represented (e.g., 'C*' vs 'C')

    const ranks = position.split('/')
    if (ranks.length !== 12) {
      throw new Error(`Invalid FEN: expected 12 ranks, got ${ranks.length}`)
    }

    for (let r = 0; r < 12; r++) {
      const rankStr = ranks[r]
      let fileIndex = 0
      let currentRankSquares = 0

      for (let i = 0; i < rankStr.length; i++) {
        const char = rankStr.charAt(i)

        if (isDigit(char)) {
          // Handle multi-digit numbers for empty squares
          let numStr = char
          if (i + 1 < rankStr.length && isDigit(rankStr.charAt(i + 1))) {
            numStr += rankStr.charAt(i + 1)
            i++
          }
          const emptySquares = parseInt(numStr, 10)
          if (fileIndex + emptySquares > 11) {
            throw new Error(
              `Invalid FEN: rank ${12 - r} has too many squares (${rankStr})`,
            )
          }
          fileIndex += emptySquares
          currentRankSquares += emptySquares
        } else {
          // Check for stack notation '('
          if (char === '(') {
            const endParen = rankStr.indexOf(')', i)
            if (endParen === -1) {
              throw new Error(
                `Invalid FEN: Unmatched parenthesis in rank ${12 - r}`,
              )
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
            // TODO: Validate carrier type

            const carriedPieces: Piece[] = []
            for (let j = carrierIndex + 1; j < stackContent.length; j++) {
              // TODO: Handle heroic carried pieces if notation allows e.g. (+F)
              const carriedChar = stackContent[j]
              const carriedColor = carriedChar < 'a' ? RED : BLUE
              const carriedType = carriedChar.toLowerCase() as PieceSymbol
              // TODO: Validate carried type and color (must match carrier)
              if (carriedColor !== carrierColor) {
                console.warn(
                  `Carried piece color mismatch in stack: ${stackContent}`,
                )
                continue // Skip invalid carried piece
              }
              carriedPieces.push({ type: carriedType, color: carriedColor })
            }

            // TODO: Validate stack based on carrierBlueprints (deferred)

            const sq0x88 = r * 16 + fileIndex
            this._board[sq0x88] = {
              type: carrierType,
              color: carrierColor,
              carried: carriedPieces.length > 0 ? carriedPieces : undefined,
              heroic: carrierHeroic, // Add heroic status
            }

            if (carrierType === COMMANDER) {
              if (this._commanders[carrierColor] === -1) {
                this._commanders[carrierColor] = sq0x88
              } else {
                console.warn(
                  `Multiple commanders found for color ${carrierColor}.`,
                )
              }
            }

            fileIndex++
            currentRankSquares++
            i = endParen // Move parser past the closing parenthesis
            continue // Skip to next char in rank string
          }

          // Check for heroic status with '+' prefix (for single pieces)
          let isHeroic = false
          if (char === '+') {
            isHeroic = true
            i++ // Move to the next character (the actual piece)
            if (i >= rankStr.length) {
              throw new Error(`Invalid FEN: '+' at the end of rank ${12 - r}`)
            }
          }

          // Handle piece character
          const pieceChar = isHeroic ? rankStr.charAt(i) : char
          const color = pieceChar < 'a' ? RED : BLUE // Use RED/BLUE constants
          let type = pieceChar.toLowerCase() as PieceSymbol

          // TODO: Validate piece type is known
          // Use 'in' operator which works across ES versions
          if (!(type in VALID_PIECE_TYPES) && type !== HEADQUARTER) {
            console.warn(`Unknown piece type in FEN: ${type}`)
            // Decide how to handle: error or skip? Skipping for now.
            fileIndex++
            currentRankSquares++
            continue
          }

          const sq0x88 = r * 16 + fileIndex
          this._board[sq0x88] = { type, color, heroic: isHeroic }
          if (type === COMMANDER) {
            // Only track Commander now
            if (this._commanders[color] === -1) {
              this._commanders[color] = sq0x88
            } else {
              console.warn(`Multiple commanders found for color ${color}.`)
            }
          }

          fileIndex++
          currentRankSquares++
        }
      }
      if (currentRankSquares !== 11) {
        throw new Error(
          `Invalid FEN: rank ${
            12 - r
          } does not have 11 squares (${rankStr}, counted ${currentRankSquares})`,
        )
      }
    }

    this._turn = (tokens[1] as Color) || RED
    // No castling or EP to parse based on rules provided
    this._halfMoves = parseInt(tokens[4], 10) || 0
    this._moveNumber = parseInt(tokens[5], 10) || 1

    // TODO: _updateSetup, _incPositionCount
  }

  // FEN generation - needs heroic status representation
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
          if (piece.carried && piece.carried.length > 0) {
            // Format stack: (CP1P2...) or +(CP1P2...)
            let stackStr =
              piece.color === RED
                ? piece.type.toUpperCase()
                : piece.type.toLowerCase()
            // Sort carried pieces alphabetically for consistent FEN? Or keep original order? Let's sort.
            const carriedSorted = [...piece.carried].sort((a, b) =>
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

  // --- Get/Put/Remove (Updated for Heroic) ---
  get(square: Square): Piece | undefined {
    const sq = SQUARE_MAP[square]
    if (sq === undefined) return undefined
    const piece = this._board[sq]
    return piece
  }

  put(
    {
      type,
      color,
      heroic = false,
      carried = undefined, // Add optional carried pieces
    }: { type: PieceSymbol; color: Color; heroic?: boolean; carried?: Piece[] },
    square: Square,
  ): boolean {
    if (!(square in SQUARE_MAP)) return false
    const sq = SQUARE_MAP[square]

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
      carried: carried?.length ? carried : undefined,
      heroic: heroic ?? false, // Default to false if undefined
    }
    if (type === COMMANDER) this._commanders[color] = sq

    // TODO: Update setup, etc.
    return true
  }

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
    if (moveCommand.move.captured) {
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

    // TODO: Update position count for threefold repetition
    // this._incPositionCount(this.fen());
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

  public undo(): void {
    this._undoMove()
  }
  public getPieceAt(square: number): Piece | undefined {
    return this._board[square]
  }
  public deletePieceAt(square: number): void {
    delete this._board[square]
  }
  public setPieceAt(square: number, piece: Piece): void {
    this._board[square] = piece
  }

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

  isCheck(): boolean {
    return this._isCommanderAttacked(this._turn)
  }

  isCheckmate(): boolean {
    // Checkmate = Commander is attacked AND no legal moves exist
    return this.isCheck() && this._moves({ legal: true }).length === 0
  }

  // TODO: Implement isInsufficientMaterial, isThreefoldRepetition, isDrawByFiftyMoves based on variant rules
  isDrawByFiftyMoves(): boolean {
    return this._halfMoves >= 100 // 50 moves per side
  }

  isDraw(): boolean {
    return this.isDrawByFiftyMoves() // Add other draw conditions later (repetition, insufficient material)
  }

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
    const pieceChar = move.piece.toUpperCase()
    const disambiguator = getDisambiguator(move, moves)
    const toAlg = algebraic(move.to) // Target square
    const heroicPrefix =
      (this.getHeroicStatus(move.from, move.piece) ?? false) ? '+' : '' // Simplified: Assume Move class handles this better
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
      if (parsed.piece && m.piece !== parsed.piece) continue

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
          (move.piece ? move.piece === m.piece : true)
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
    // TODO: Update position count: this._incPositionCount(this.fen());

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

  turn(): Color {
    return this._turn
  }

  // ... (board, squareColor, history, comments, moveNumber need review/adaptation) ...
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

  // Get a piece at a square, optionally specifying a piece type to find in a stack
  getPieceAtSquare(
    square: Square | number,
    pieceType?: PieceSymbol,
  ): Piece | undefined {
    const sq = typeof square === 'number' ? square : SQUARE_MAP[square]
    if (sq === undefined) return undefined

    const pieceAtSquare = this._board[sq]
    if (!pieceAtSquare) return undefined

    // If no specific piece type requested or the piece matches the requested type, return it
    if (!pieceType || pieceAtSquare.type === pieceType) {
      return pieceAtSquare
    }

    // Check if the requested piece is being carried in a stack
    if (pieceAtSquare.carried && pieceAtSquare.carried.length > 0) {
      return pieceAtSquare.carried.find((p) => p.type === pieceType)
    }

    return undefined
  }

  // Get heroic status of a piece at a square
  getHeroicStatus(square: Square | number, pieceType?: PieceSymbol): boolean {
    const piece = this.getPieceAtSquare(square, pieceType)
    return piece?.heroic ?? false
  }

  moveNumber(): number {
    return this._moveNumber
  }

  // --- Comments ---
  getComment(): string | undefined {
    return this._comments[this.fen()]
  }
  setComment(comment: string) {
    this._comments[this.fen()] = comment
  }
  removeComment(): string | undefined {
    const comment = this._comments[this.fen()]
    delete this._comments[this.fen()]
    return comment
  }
  // Removed printTerrainZones

  printBoard(): void {
    printBoard(this._board)
  }

  // TODO: getComments, removeComments need pruning logic like chess.js if history is mutable
}

export * from './type.js'
