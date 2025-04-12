/**
 * @license
 * Adapted from chess.js by Jeff Hlywa (jhlywa@gmail.com)
 * Copyright (c) 2024, Hoang Manh/cotulenh.js
 * All rights reserved.
 */

// --- Constants ---
export const RED = 'r' // Changed from WHITE
export const BLUE = 'b' // Changed from BLACK

// Piece Symbols based on user input
export const COMMANDER = 'c'
export const INFANTRY = 'i'
export const TANK = 't'
export const MILITIA = 'm'
export const ENGINEER = 'e' // Added Engineer
export const ARTILLERY = 'a'
export const ANTI_AIR = 'g'
export const MISSILE = 's'
export const AIR_FORCE = 'f'
export const NAVY = 'n'
export const HEADQUARTER = 'h'

// Pieces that can perform stay capture *while being carried*
const CAN_STAY_CAPTURE_WHEN_CARRIED: PieceSymbol[] = [AIR_FORCE]

// --- Types ---
export type Color = 'r' | 'b' // Updated Color type
export type PieceSymbol =
  | 'c'
  | 'i'
  | 't'
  | 'm'
  | 'e'
  | 'a'
  | 'g'
  | 's'
  | 'f'
  | 'n'
  | 'h' // Updated PieceSymbol

// Generate Square type for 11x12 board (a1 to k12)
const FILES = 'abcdefghijk'.split('') // 11 files
const RANKS = '12,11,10,9,8,7,6,5,4,3,2,1'.split(',') // 12 ranks

type SquareTuple = {
  [F in (typeof FILES)[number]]: {
    [R in (typeof RANKS)[number]]: `${F}${R}`
  }[(typeof RANKS)[number]]
}[(typeof FILES)[number]]

export type Square = SquareTuple

// Corrected FEN based on user input and standard additions, updated turn to RED
// NOTE: Engineer 'e' is not in this FEN. Needs clarification if it should be.
export const DEFAULT_POSITION =
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m3i/11/11/2IE2M3I/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1' // Changed 'w' to 'r'

export type Piece = {
  color: Color
  type: PieceSymbol
  carried?: Piece[] // Array to hold carried pieces (excluding the carrier itself)
}

// --- 0x88 Style Board Representation (Adapted for 16x16) ---
// We use a 16x16 board (256 squares) to fit 11x12
// Square 0 = a12, Square 1 = b12, ..., Square 10 = k12
// Square 16 = a11, ..., Square 26 = k11
// ...
// Square 176 = a1, ..., Square 186 = k1

//prettier-ignore
const SQUARE_MAP: Record<Square, number> = {
  // Rank 12 (top)
  a12: 0x00, b12: 0x01, c12: 0x02, d12: 0x03, e12: 0x04, f12: 0x05, g12: 0x06, h12: 0x07, i12: 0x08, j12: 0x09, k12: 0x0A,
  // Rank 11
  a11: 0x10, b11: 0x11, c11: 0x12, d11: 0x13, e11: 0x14, f11: 0x15, g11: 0x16, h11: 0x17, i11: 0x18, j11: 0x19, k11: 0x1A,
  // Rank 10
  a10: 0x20, b10: 0x21, c10: 0x22, d10: 0x23, e10: 0x24, f10: 0x25, g10: 0x26, h10: 0x27, i10: 0x28, j10: 0x29, k10: 0x2A,
  // Rank 9
  a9: 0x30, b9: 0x31, c9: 0x32, d9: 0x33, e9: 0x34, f9: 0x35, g9: 0x36, h9: 0x37, i9: 0x38, j9: 0x39, k9: 0x3A,
  // Rank 8
  a8: 0x40, b8: 0x41, c8: 0x42, d8: 0x43, e8: 0x44, f8: 0x45, g8: 0x46, h8: 0x47, i8: 0x48, j8: 0x49, k8: 0x4A,
  // Rank 7
  a7: 0x50, b7: 0x51, c7: 0x52, d7: 0x53, e7: 0x54, f7: 0x55, g7: 0x56, h7: 0x57, i7: 0x58, j7: 0x59, k7: 0x5A,
  // Rank 6
  a6: 0x60, b6: 0x61, c6: 0x62, d6: 0x63, e6: 0x64, f6: 0x65, g6: 0x66, h6: 0x67, i6: 0x68, j6: 0x69, k6: 0x6A,
  // Rank 5
  a5: 0x70, b5: 0x71, c5: 0x72, d5: 0x73, e5: 0x74, f5: 0x75, g5: 0x76, h5: 0x77, i5: 0x78, j5: 0x79, k5: 0x7A,
  // Rank 4
  a4: 0x80, b4: 0x81, c4: 0x82, d4: 0x83, e4: 0x84, f4: 0x85, g4: 0x86, h4: 0x87, i4: 0x88, j4: 0x89, k4: 0x8A,
  // Rank 3
  a3: 0x90, b3: 0x91, c3: 0x92, d3: 0x93, e3: 0x94, f3: 0x95, g3: 0x96, h3: 0x97, i3: 0x98, j3: 0x99, k3: 0x9A,
  // Rank 2
  a2: 0xA0, b2: 0xA1, c2: 0xA2, d2: 0xA3, e2: 0xA4, f2: 0xA5, g2: 0xA6, h2: 0xA7, i2: 0xA8, j2: 0xA9, k2: 0xAA,
  // Rank 1 (bottom)
  a1: 0xB0, b1: 0xB1, c1: 0xB2, d1: 0xB3, e1: 0xB4, f1: 0xB5, g1: 0xB6, h1: 0xB7, i1: 0xB8, j1: 0xB9, k1: 0xBA
};

const NAVY_MASK = new Uint8Array(256) // 1 = navigable by navy
const LAND_MASK = new Uint8Array(256) // 1 = accessible by light pieces

// Initialize movement masks
function initMovementMasks() {
  for (let sq = 0; sq < 256; sq++) {
    if (!isSquareOnBoard(sq)) continue // Add validity check
    const f = file(sq)
    const r = rank(sq)
    const alg = algebraic(sq)

    // Navy operational areas (a-c files + specific squares)
    NAVY_MASK[sq] = f <= 2 || ['d6', 'e6', 'd7', 'e7'].includes(alg) ? 1 : 0

    // Land pieces operational areas (c-k files)
    LAND_MASK[sq] = f >= 2 ? 1 : 0
  }
}
initMovementMasks()

// --- Helper Functions ---

// Check if a square index is on the 11x12 board within the 16x16 grid
function isSquareOnBoard(sq: number): boolean {
  const r = rank(sq)
  const f = file(sq)
  return r >= 0 && r < 12 && f >= 0 && f < 11
}

// Extracts the zero-based rank (0-11) from a 0x88 square index.
function rank(square: number): number {
  return square >> 4
}

// Extracts the zero-based file (0-10) from a 0x88 square index.
function file(square: number): number {
  return square & 0xf
}

// Converts a square index to algebraic notation (e.g., 0 -> a12, 186 -> k1).
function algebraic(square: number): Square {
  const f = file(square)
  const r = rank(square)
  if (!isSquareOnBoard(square)) {
    throw new Error(
      `Invalid square index for algebraic conversion: ${square} (f=${f}, r=${r})`,
    )
  }
  // RANKS array is '12' down to '1', so index r corresponds to RANKS[r]
  return (FILES[f] + RANKS[r]) as Square
}

function swapColor(color: Color): Color {
  return color === RED ? BLUE : RED // Updated swapColor
}

function isDigit(c: string): boolean {
  return '0123456789'.indexOf(c) !== -1
}
// --- Move Flags ---
const FLAGS: Record<string, string> = {
  NORMAL: 'n',
  CAPTURE: 'c',
  HEROIC_PROMOTION: 'h', // Flag for when a piece becomes heroic
  STAY_CAPTURE: 's', // General flag for capturing without moving
  DEPLOY: 'd', // Flag for deploy move
}

const BITS: Record<string, number> = {
  NORMAL: 1,
  CAPTURE: 2,
  HEROIC_PROMOTION: 4, // Example bit
  STAY_CAPTURE: 8, // General flag bit
  DEPLOY: 16, // Added deploy bit
}

// --- Move/History Types ---
// Internal representation of a move
type InternalMove = {
  color: Color
  from: number // 0x88 index
  to: number // 0x88 index (destination OR target square for stay capture)
  piece: PieceSymbol // The piece being moved (or deployed)
  captured?: PieceSymbol
  // promotion?: PieceSymbol; // Promotion is status change, not piece change?
  flags: number // Bitmask using BITS
  becameHeroic?: boolean // Track if this move caused promotion
}

// Structure for storing history states
interface History {
  move: InternalMove
  kings: Record<Color, number> // Position of commander before the move
  turn: Color
  // castling: Record<Color, number>; // No castling mentioned
  // epSquare: number; // No en passant mentioned
  halfMoves: number // Half move clock before the move
  moveNumber: number // Move number before the move
  heroicStatus: Record<number, boolean> // Snapshot of heroic status before move
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
  heroic: boolean // Was the piece heroic *before* this move?
  becameHeroic?: boolean // Did the piece become heroic *on* this move?
  targetSquare?: Square // For stay capture, the square of the captured piece
  isDeploy: boolean // Was this a deploy move from a stack?
  stackBefore?: string // Optional: FEN-like representation of the stack before deploy, e.g., "(NFT)"

  // Constructor needs the main class instance to generate SAN, FENs etc.
  constructor(game: CoTuLenh, internal: InternalMove, pieceWasHeroic: boolean) {
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
    this.heroic = pieceWasHeroic // Heroic status of the piece *before* it moved/deployed
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
    this.before = 'FEN_BEFORE_PLACEHOLDER' // Will be set by move()
    this.after = 'FEN_AFTER_PLACEHOLDER' // Will be set by move()

    // --- SAN Generation (Placeholder - needs refinement in CoTuLenh class) ---
    const pieceChar = this.piece.toUpperCase()
    const heroicPrefix = this.heroic ? '+' : '' // Heroic status of the piece moving/deploying
    const heroicSuffix = this.becameHeroic ? '+' : '' // Update to use '+' for heroic notation
    let san = ''

    if (this.isDeploy) {
      // Deploy move: (Stack)PieceFrom>To or (Stack)PieceFrom>xTo or (Stack)PieceFrom<Target
      const stackRep = this.stackBefore || '(?)' // Placeholder
      if (flags & BITS.STAY_CAPTURE) {
        const target = algebraic(to) // 'to' is target
        san = `${stackRep}${heroicPrefix}${pieceChar}${this.from}<${target}${heroicSuffix}`
      } else {
        const separator = flags & BITS.CAPTURE ? '>x' : '>'
        const dest = algebraic(to) // 'to' is destination
        san = `${stackRep}${heroicPrefix}${pieceChar}${this.from}${separator}${dest}${heroicSuffix}`
      }
    } else if (flags & BITS.STAY_CAPTURE) {
      // Normal Stay capture: PieceFrom<Target
      const target = algebraic(to) // 'to' is the target
      san = `${heroicPrefix}${pieceChar}${this.from}<${target}${heroicSuffix}`
    } else {
      // Normal move: PieceFrom-To or PieceFromxTo
      const separator = flags & BITS.CAPTURE ? 'x' : '-'
      const dest = algebraic(to) // 'to' is the destination
      san = `${heroicPrefix}${pieceChar}${this.from}${separator}${dest}${heroicSuffix}`
    }

    // TODO: Add ambiguity resolution to SAN (needs access to all legal moves)
    this.san = san // Store basic SAN for now
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

// --- Piece Offsets (Initial Definitions & TODOs) ---
const ORTHOGONAL_OFFSETS = [-16, 1, 16, -1] // N, E, S, W
const DIAGONAL_OFFSETS = [-17, -15, 17, 15] // NE, NW, SE, SW
const ALL_OFFSETS = [...ORTHOGONAL_OFFSETS, ...DIAGONAL_OFFSETS]

// These offsets define the *direction* of movement. Range and blocking are handled in move generation.
const PIECE_OFFSETS: Partial<Record<PieceSymbol, number[]>> = {
  c: ALL_OFFSETS, // Commander: any direction (sliding), captures adjacent (special handling needed)
  i: ORTHOGONAL_OFFSETS, // Infantry/Engineer: 1 step orthogonal
  e: ORTHOGONAL_OFFSETS, // Engineer: 1 step orthogonal
  t: ORTHOGONAL_OFFSETS, // Tank: Up to 2 steps orthogonal (sliding with range limit)
  m: ALL_OFFSETS, // Militia: 1 step any direction
  a: ALL_OFFSETS, // Artillery: Up to 3 steps any direction (sliding with range limit), capture ignores blocking
  g: ORTHOGONAL_OFFSETS, // Anti-Air: 1 step orthogonal
  s: ALL_OFFSETS, // Missile: Complex range (2 ortho + 1 diag), capture ignores blocking (special handling)
  f: ALL_OFFSETS, // Air Force: Up to 4 steps any direction (sliding with range limit), ignores blocking
  n: ALL_OFFSETS, // Navy: Up to 4 steps move/capture, up to 3 steps capture L, terrain rules, optional stay capture
  h: [], // Headquarter: No movement
}

// --- CoTuLenh Class (Additions) ---
export class CoTuLenh {
  private _board = new Array<Piece | undefined>(256)
  private _turn: Color = RED // Default to Red
  private _header: Record<string, string> = {}
  private _kings: Record<Color, number> = { r: -1, b: -1 } // Commander positions
  // private _castling: Record<Color, number> = { r: 0, b: 0 }; // No castling
  // private _epSquare = -1; // No en passant
  private _halfMoves = 0
  private _moveNumber = 1
  private _history: History[] = []
  private _comments: Record<string, string> = {}
  private _positionCount: Record<string, number> = {}
  private _heroicStatus: Record<number, boolean> = {} // Tracks heroic status by square index
  private _deployState: { stackSquare: number; turn: Color } | null = null // Tracks active deploy phase

  constructor(fen = DEFAULT_POSITION) {
    this.load(fen)
  }

  clear({ preserveHeaders = false } = {}) {
    this._board = new Array<Piece | undefined>(256)
    this._kings = { r: -1, b: -1 }
    this._turn = RED
    // this._castling = { r: 0, b: 0 };
    // this._epSquare = -1;
    this._halfMoves = 0
    this._moveNumber = 1
    this._history = []
    this._comments = {}
    this._header = preserveHeaders ? this._header : {}
    this._positionCount = {}
    this._heroicStatus = {} // Clear heroic status
    this._deployState = null // Clear deploy state

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
            }
            if (carrierHeroic) this._setHeroic(sq0x88, true)

            if (carrierType === COMMANDER) {
              if (this._kings[carrierColor] === -1) {
                this._kings[carrierColor] = sq0x88
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
          if (!(type in PIECE_OFFSETS) && type !== HEADQUARTER) {
            console.warn(`Unknown piece type in FEN: ${type}`)
            // Decide how to handle: error or skip? Skipping for now.
            fileIndex++
            currentRankSquares++
            continue
          }

          const sq0x88 = r * 16 + fileIndex
          this._board[sq0x88] = { type, color }
          if (isHeroic) this._setHeroic(sq0x88, true)

          if (type === COMMANDER) {
            // Only track Commander now
            if (this._kings[color] === -1) {
              this._kings[color] = sq0x88
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
            if (this.isHeroic(sq)) {
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
            if (this.isHeroic(sq)) {
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

  // --- Heroic Status ---
  isHeroic(square: Square | number): boolean {
    const sq = typeof square === 'number' ? square : SQUARE_MAP[square]
    if (sq === undefined) return false
    return !!this._heroicStatus[sq]
  }

  private _setHeroic(square: number, status: boolean) {
    if (status) {
      this._heroicStatus[square] = true
    } else {
      delete this._heroicStatus[square]
    }
  }

  // --- Get/Put/Remove (Updated for Heroic) ---
  get(square: Square): (Piece & { heroic: boolean }) | undefined {
    const sq = SQUARE_MAP[square]
    if (sq === undefined) return undefined
    const piece = this._board[sq]
    return piece ? { ...piece, heroic: this.isHeroic(sq) } : undefined
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
      this._kings[color] !== -1 &&
      this._kings[color] !== sq
    ) {
      return false
    }

    const currentPiece = this._board[sq]
    if (
      currentPiece &&
      currentPiece.type === COMMANDER &&
      this._kings[currentPiece.color] === sq
    ) {
      this._kings[currentPiece.color] = -1
    }
    // Remove heroic status if piece is replaced
    if (this.isHeroic(sq)) {
      this._setHeroic(sq, false)
    }

    // Place the piece or stack
    this._board[sq] = {
      type,
      color,
      carried: carried?.length ? carried : undefined,
    }
    if (type === COMMANDER) this._kings[color] = sq
    if (heroic) this._setHeroic(sq, true)

    // TODO: Update setup, etc.
    return true
  }

  remove(square: Square): (Piece & { heroic: boolean }) | undefined {
    if (!(square in SQUARE_MAP)) return undefined
    const sq = SQUARE_MAP[square]
    const piece = this._board[sq]
    const wasHeroic = this.isHeroic(sq)

    if (!piece) return undefined

    delete this._board[sq]
    if (wasHeroic) this._setHeroic(sq, false)

    if (piece.type === COMMANDER && this._kings[piece.color] === sq) {
      this._kings[piece.color] = -1
    }

    // TODO: Update setup, etc.
    return { ...piece, heroic: wasHeroic }
  }
  private isHeavyZone(sq: number): 0 | 1 | 2 {
    const f = file(sq)
    const r = rank(sq)
    if (f < 2) return 0 // Not in heavy zone

    return r <= 5 ? 1 : 2 // 1 = upper half, 2 = lower half
  }

  private isBridgeCrossing(from: number, to: number): boolean {
    const path = this._getPath(from, to)

    // Check if both squares of either bridge are present in the path
    const hasF6 = path.includes(SQUARE_MAP.f6)
    const hasF7 = path.includes(SQUARE_MAP.f7)
    const hasH6 = path.includes(SQUARE_MAP.h6)
    const hasH7 = path.includes(SQUARE_MAP.h7)

    // Valid crossing requires both squares of either bridge
    return (hasF6 && hasF7) || (hasH6 && hasH7)
  }

  // --- Move Generation Helper ---
  // Generates pseudo-legal moves for a *single* piece from a given square,
  // considering its type, color, heroic status, and board state.
  // Does NOT handle deploy state or filtering for king safety.
  // Added isDeployMove flag to handle special stay capture rules.
  private _generateMovesForPiece(
    from: number,
    pieceData: Piece,
    isHero: boolean,
    isDeployMove = false, // Flag to indicate if this is a deploy move
  ): InternalMove[] {
    const moves: InternalMove[] = []
    const us = pieceData.color
    const them = swapColor(us)

    // --- Determine Movement Properties based on piece and heroic status ---
    let moveRange = 1
    let canMoveDiagonal = false
    let isSliding = false
    let captureRange = 1
    let captureIgnoresPieceBlocking = false // Specific to blocking by other pieces
    let moveIgnoresBlocking = false // Ignores pieces and terrain for movement

    // Base ranges/abilities
    switch (pieceData.type) {
      case COMMANDER:
        isSliding = true
        moveRange = Infinity
        captureRange = 1 // Special capture rule
        canMoveDiagonal = true
        break
      case INFANTRY:
      case ENGINEER:
      case ANTI_AIR:
        moveRange = 1
        captureRange = 1
        break
      case TANK:
        moveRange = 2
        captureRange = 2
        isSliding = true
        break
      case MILITIA:
        moveRange = 1
        captureRange = 1
        canMoveDiagonal = true
        break
      case ARTILLERY:
        isSliding = true
        moveRange = 3
        captureRange = 3
        captureIgnoresPieceBlocking = true // Can shoot over blocking pieces
        canMoveDiagonal = true
        break
      case MISSILE:
        isSliding = true
        moveRange = 2 // Approximation
        captureRange = 2 // Approximation
        captureIgnoresPieceBlocking = true // Can shoot over blocking pieces
        canMoveDiagonal = true
        break
      case AIR_FORCE:
        isSliding = true
        moveRange = 4
        captureRange = 4
        moveIgnoresBlocking = true // Ignores piece and terrain blocking for move AND capture
        captureIgnoresPieceBlocking = true // Explicitly ignores piece blocking for capture
        canMoveDiagonal = true
        break
      case NAVY:
        isSliding = true
        moveRange = 4 // Base move range
        captureRange = 4 // Default to maximum range (for torpedo attacks)
        canMoveDiagonal = true
        // Navy has two attack mechanisms:
        // 1. Naval Gun: Range 3, targets land pieces
        // 2. Torpedo: Range 4, targets other Navy pieces
        break
      case HEADQUARTER:
        moveRange = 0
        captureRange = 0
        break
    }

    // Apply Heroic bonus
    if (isHero) {
      moveRange++
      captureRange++
      canMoveDiagonal = true // All heroic pieces can move diagonally
      if (pieceData.type === HEADQUARTER) {
        // Heroic HQ moves like Militia
        moveRange = 1
        captureRange = 1
        isSliding = false // HQ steps, doesn't slide
      }
    }

    const currentOffsets = canMoveDiagonal ? ALL_OFFSETS : ORTHOGONAL_OFFSETS

    // --- Generate Moves based on Offsets and Rules ---

    // Standard offset iteration for other pieces
    for (const offset of currentOffsets) {
      let currentRange = 0
      let to = from
      let pieceBlockedMovement = false // Track if movement path is blocked by a piece
      let terrainBlockedMovement = false // Track if movement path is blocked by terrain

      while (true) {
        // Loop for sliding pieces or single step
        to += offset
        currentRange++

        if (!isSquareOnBoard(to)) break // Off the 11x12 board

        if (
          pieceData.type === MISSILE &&
          DIAGONAL_OFFSETS.includes(offset) &&
          currentRange > moveRange - 1
        ) {
          break // For diagonals, missile can only move (moveRange - 1) steps
        }

        if (currentRange > moveRange && currentRange > captureRange) break // Exceeded both move and capture range

        const targetPiece = this._board[to]
        const isHeavyPiece = [ARTILLERY, MISSILE, ANTI_AIR].includes(
          pieceData.type,
        )

        // --- Terrain Blocking Check (Movement Only) ---
        // Rely on the flag now
        if (pieceData.type === NAVY) {
          // Navy can only MOVE onto NAVY_MASK squares
          if (!NAVY_MASK[to]) {
            terrainBlockedMovement = true
          }
        } else {
          // Assuming non-Navy are land pieces for this check
          // Land pieces cannot MOVE onto non-LAND_MASK squares (pure water)
          if (!LAND_MASK[to]) {
            terrainBlockedMovement = true
          } else if (pieceData.type === AIR_FORCE) {
            // Air Force is land piece but it flies over water as long as the destination is land.
            terrainBlockedMovement = false
          }
          // Heavy piece river crossing rule (Movement Only)
          if (isHeavyPiece && !terrainBlockedMovement) {
            const zoneFrom = this.isHeavyZone(from)
            const zoneTo = this.isHeavyZone(to)
            if (zoneFrom !== 0 && zoneTo !== 0 && zoneFrom !== zoneTo) {
              const isCrossingBridge = this.isBridgeCrossing(from, to)
              if (!isCrossingBridge) {
                // Cannot cross river unless via bridge (movement)
                terrainBlockedMovement = true
              }
            }
          }
        }
        // Note: Terrain blocking for *capture targeting* is ignored per rules.

        // --- Target Square Analysis ---
        let canMoveToSquare = !terrainBlockedMovement // Assume can move unless terrain blocked

        if (targetPiece) {
          // --- Capture Logic ---
          if (targetPiece.color === them && currentRange <= captureRange) {
            let captureAllowed = true
            let addNormalCapture = true
            let addStayCapture = false

            // Commander captures only adjacent
            if (pieceData.type === COMMANDER && currentRange > 1) {
              captureAllowed = false
            }

            // Navy attack mechanisms & Stay Capture Rule
            if (pieceData.type === NAVY) {
              if (targetPiece.type === NAVY) {
                // Torpedo attack: Range 4 (5 if heroic)
                if (currentRange > (isHero ? 5 : 4)) {
                  captureAllowed = false
                }
              } else {
                // Naval Gun attack: Range 3 (4 if heroic)
                if (currentRange > (isHero ? 4 : 3)) {
                  captureAllowed = false
                }
              }
            }

            // Check if path is blocked by PIECES for capture
            if (
              captureAllowed &&
              !captureIgnoresPieceBlocking && // Check piece blocking flag
              pieceBlockedMovement // Check if movement path was blocked by a piece
            ) {
              // Tank special case: can capture at range 2 even if blocked at 1
              if (pieceData.type === TANK && currentRange === 2) {
                // Allow capture if the blocking piece was at range 1
                // Need to check if the *specific* blocking piece was at range 1
                // This requires tracking the blocking square, complex.
                // Simpler: Assume Tank can capture at range 2 if path was blocked earlier.
                captureAllowed = true
              } else {
                captureAllowed = false // Blocked by piece for capture
              }
            }
            // Note: Terrain blocking for capture targeting is ignored per rules.

            // NEW: Check if a normal capture would land on invalid terrain for the attacker
            if (captureAllowed && addNormalCapture) {
              // Use flag
              const isTargetTerrainValidForAttacker =
                pieceData.type === NAVY ? NAVY_MASK[to] : LAND_MASK[to]

              // Force stay capture if target terrain is invalid for attacker's movement,
              // UNLESS the piece is allowed to stay capture when carried (and this is a deploy move).
              if (!isTargetTerrainValidForAttacker) {
                if (
                  isDeployMove &&
                  CAN_STAY_CAPTURE_WHEN_CARRIED.includes(pieceData.type)
                ) {
                  // Allow both normal and stay capture for pieces like Air Force during deploy
                  // if the target terrain is invalid for *movement* but capture is allowed.
                  // However, if AF targets water, it *must* stay capture.
                  if (pieceData.type === AIR_FORCE && !LAND_MASK[to]) {
                    addNormalCapture = false // Cannot land on water
                    addStayCapture = true
                  } else {
                    // Allow both for now, maybe refine later if needed
                    addNormalCapture = true
                    addStayCapture = true
                  }
                } else if (
                  !isDeployMove &&
                  pieceData.type === AIR_FORCE &&
                  !LAND_MASK[to]
                ) {
                  // Normal Air Force move targeting water must stay capture
                  addNormalCapture = false
                  addStayCapture = true
                } else {
                  // All other cases where target terrain is invalid force stay capture
                  addNormalCapture = false
                  addStayCapture = true
                }
              }
            }

            if (captureAllowed) {
              if (addNormalCapture) {
                addMove(
                  moves,
                  us,
                  from,
                  to,
                  pieceData.type,
                  targetPiece.type,
                  BITS.CAPTURE,
                )
              }
              if (addStayCapture) {
                // For stay capture, 'to' stores the *target* square
                addMove(
                  moves,
                  us,
                  from,
                  to, // 'to' is the target square
                  pieceData.type,
                  targetPiece.type,
                  BITS.CAPTURE | BITS.STAY_CAPTURE,
                )
              }
            }
          } // End capture check (if targetPiece.color === them)

          // --- Piece Blocking Check (Movement) ---
          if (!moveIgnoresBlocking) {
            // Use flag
            // Navy ignores FRIENDLY piece blocking
            if (!(pieceData.type === NAVY && targetPiece.color === us)) {
              pieceBlockedMovement = true // Mark path as blocked for further movement
            }
          }

          // If piece cannot capture over other pieces, stop checking this direction
          if (!captureIgnoresPieceBlocking && pieceData.type !== TANK) {
            // If movement is blocked by a piece, and the current piece
            // cannot shoot over pieces (and isn't a Tank), stop.
            if (pieceBlockedMovement) break
          }
          // Otherwise (can shoot over pieces or is Tank), continue checking
          // for captures further along the path.
        } else {
          // --- Move to Empty Square Logic ---
          // Check movement range AND terrain/piece blocking
          if (
            currentRange <= moveRange &&
            canMoveToSquare && // Use the flag determined above
            !pieceBlockedMovement
          ) {
            addMove(moves, us, from, to, pieceData.type)
          }
        }

        // --- Loop Termination/Continuation Logic ---

        // 1. Stop if not a sliding piece (already handled the single step)
        if (!isSliding) break

        // 2. Stop ONLY if path is blocked by a piece AND the current piece cannot capture over other pieces.
        //    Terrain blocking does NOT stop the loop for sliding pieces checking for captures.
        if (
          pieceBlockedMovement &&
          !captureIgnoresPieceBlocking &&
          !moveIgnoresBlocking
        ) {
          break
        }
        // Note: Terrain blocking (`terrainBlockedMovement`) does NOT break the loop here.
        // It only prevents adding a NORMAL move onto the blocked square.
        // Sliding pieces continue checking subsequent squares for CAPTURES even if terrain blocks movement onto intermediate squares.
      } // End while loop for sliding range
    } // End for loop over offsets
    return moves
  }

  // --- Main Move Generation ---
  private _moves({
    legal = true,
    piece: filterPiece = undefined, // Renamed to avoid conflict
    square: filterSquare = undefined, // Renamed
    ignoreSafety = false,
  }: {
    legal?: boolean
    piece?: PieceSymbol
    square?: Square
    ignoreSafety?: boolean
  } = {}): InternalMove[] {
    let allMoves: InternalMove[] = []
    const us = this.turn()
    const them = swapColor(us)

    // --- Handle Active Deploy State ---
    if (this._deployState && this._deployState.turn === us) {
      const stackSquare = this._deployState.stackSquare
      const carrierPiece = this._board[stackSquare]

      if (!carrierPiece || carrierPiece.color !== us || !carrierPiece.carried) {
        // Should not happen if deployState is valid, but good to check
        console.error('Invalid deploy state detected.')
        this._deployState = null // Clear invalid state
        // Proceed to normal move generation? Or return empty? Let's return empty.
        return []
      }

      // Generate Deploy Moves for remaining carried pieces
      for (const carriedPiece of carrierPiece.carried) {
        // TODO: Check if filterPiece matches carriedPiece.type
        if (filterPiece && carriedPiece.type !== filterPiece) continue

        // Assuming carried pieces cannot be heroic for now
        const deployMoves = this._generateMovesForPiece(
          stackSquare,
          carriedPiece,
          false,
          true,
        ) // Pass isDeployMove = true
        deployMoves.forEach((m) => {
          m.flags |= BITS.DEPLOY // Add deploy flag
          allMoves.push(m)
        })
      }

      // Generate Carrier Moves
      // TODO: Check if filterPiece matches carrierPiece.type
      if (!filterPiece || carrierPiece.type === filterPiece) {
        const carrierMoves = this._generateMovesForPiece(
          stackSquare,
          carrierPiece,
          this.isHeroic(stackSquare),
        )
        allMoves.push(...carrierMoves) // Carrier moves normally (moving the stack)
      }
    } else {
      // --- Normal Move Generation (No Active Deploy State) ---
      let startSq = 0
      let endSq = 255 // Iterate over the whole 16x16 internal board

      if (filterSquare) {
        const sq = SQUARE_MAP[filterSquare]
        if (
          sq === undefined ||
          !this._board[sq] ||
          this._board[sq]?.color !== us
        )
          return []
        startSq = endSq = sq
      }

      for (let from = startSq; from <= endSq; from++) {
        if (!isSquareOnBoard(from)) continue

        const pieceData = this._board[from]
        if (!pieceData || pieceData.color !== us) continue
        if (filterPiece && pieceData.type !== filterPiece) continue

        const isHero = this.isHeroic(from)

        // Check if it's a stack
        if (pieceData.carried && pieceData.carried.length > 0) {
          // Generate Deploy Moves for carried pieces
          for (const carriedPiece of pieceData.carried) {
            // Assuming carried pieces cannot be heroic
            const deployMoves = this._generateMovesForPiece(
              from,
              carriedPiece,
              false,
              true,
            ) // Pass isDeployMove = true
            deployMoves.forEach((m) => {
              m.flags |= BITS.DEPLOY // Add deploy flag
              allMoves.push(m)
            })
          }
          // Generate Carrier Moves (moving the whole stack)
          const carrierMoves = this._generateMovesForPiece(
            from,
            pieceData,
            isHero,
          )
          allMoves.push(...carrierMoves)
        } else {
          // Generate moves for a single piece
          const singleMoves = this._generateMovesForPiece(
            from,
            pieceData,
            isHero,
          )
          allMoves.push(...singleMoves)
        }
      }
    }

    // Filter illegal moves (leaving commander in check)
    if (legal && !ignoreSafety) {
      // Only check commander safety if we're not ignoring it
      const legalMoves: InternalMove[] = []
      // Operate on the collected allMoves array
      for (const move of allMoves) {
        this._makeMove(move)
        if (!this._isKingAttacked(us)) {
          legalMoves.push(move)
        }
        this._undoMove()
      }
      return legalMoves
    }
    // Return all pseudo-legal moves if not checking legality
    return allMoves
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
      return internalMoves.map(
        (move) => new Move(this, move, this.isHeroic(move.from)),
      )
    } else {
      // Generate SAN strings (needs proper implementation)
      // Pass all legal moves for ambiguity resolution
      const allLegalMoves = this._moves({ legal: true, ignoreSafety })
      return internalMoves.map((move) => this._moveToSan(move, allLegalMoves))
    }
  }
  private _getPath(from: number, to: number): number[] {
    const path: number[] = []
    const dx = file(to) - file(from)
    const dy = rank(to) - rank(from)
    const dirX = dx && (dx > 0 ? 1 : -1) // Horizontal direction
    const dirY = dy && (dy > 0 ? 1 : -1) // Vertical direction

    // Handle orthogonal moves
    if (dx === 0 || dy === 0) {
      const steps = Math.max(Math.abs(dx), Math.abs(dy))
      const offset = dx ? dirX : dirY * 16

      for (let i = 1; i <= steps; i++) {
        const sq = from + offset * i
        if (isSquareOnBoard(sq)) path.push(sq)
      }
    }
    // Handle diagonal moves
    else if (Math.abs(dx) === Math.abs(dy)) {
      const offset = dirX + dirY * 16

      for (let i = 1; i <= Math.abs(dx); i++) {
        const sq = from + offset * i
        if (isSquareOnBoard(sq)) path.push(sq)
      }
    }
    // Handle knight-like moves (for Missile/Militia)
    else if (Math.abs(dx) + Math.abs(dy) === 3 && Math.abs(dx) !== 3) {
      // No intermediate squares for leaping pieces
      return []
    }

    return path.filter((sq) => sq !== from) // Exclude starting square
  }

  // --- Move Execution/Undo (Updated for Stay Capture & Deploy) ---
  private _makeMove(move: InternalMove) {
    const us = this.turn()
    const them = swapColor(us)

    // Capture current state for history
    const historyEntry: History = {
      move,
      kings: { ...this._kings },
      turn: us,
      halfMoves: this._halfMoves,
      moveNumber: this._moveNumber,
      heroicStatus: { ...this._heroicStatus },
      deployState: this._deployState, // Snapshot deploy state *before* this move
    }
    this._history.push(historyEntry)

    // --- Update Board ---
    let pieceThatMoved: Piece | undefined = undefined // Track the piece whose action determines clock/turn
    let finalSq: number // Track the final square for promotion checks

    if (move.flags & BITS.DEPLOY) {
      // --- Handle Deploy Move ---
      const carrierPiece = this._board[move.from]
      if (!carrierPiece || !carrierPiece.carried) {
        console.error(
          'Deploy move from non-stack or empty stack:',
          algebraic(move.from),
        )
        this._history.pop()
        return // Invalid state
      }
      // Find the deployed piece in the carried array
      const deployIndex = carrierPiece.carried.findIndex(
        (p) => p.type === move.piece && p.color === us,
      )
      if (deployIndex === -1) {
        console.error(
          'Deployed piece not found in carrier:',
          algebraic(move.from),
          move.piece,
        )
        this._history.pop()
        return // Invalid state
      }
      // Remove the piece from carried array and prepare it for placement
      pieceThatMoved = carrierPiece.carried.splice(deployIndex, 1)[0]
      if (carrierPiece.carried.length === 0) {
        carrierPiece.carried = undefined // Clear array if empty
      }

      // Handle placement (including stay capture for deploy)
      if (move.flags & BITS.STAY_CAPTURE) {
        const targetSq = move.to // Target square
        const capturedPieceData = this._board[targetSq]
        if (!capturedPieceData || capturedPieceData.color !== them) {
          console.error(
            'Deploy stay capture target square invalid:',
            algebraic(targetSq),
          )
          this._history.pop()
          return // Invalid state
        }
        delete this._board[targetSq]
        if (this.isHeroic(targetSq)) this._setHeroic(targetSq, false)
        move.captured = capturedPieceData.type
        // Deployed piece stays with carrier, so finalSq is carrier's square
        finalSq = move.from
        // Put the deployed piece back into the carrier temporarily for promotion check? No, check the piece itself.
      } else {
        // Normal deploy, piece was placed on board
        const destSq = move.to
        const capturedPieceData = this._board[destSq]
        if (move.flags & BITS.CAPTURE) {
          if (!capturedPieceData || capturedPieceData.color !== them) {
            console.error(
              'Deploy capture destination square invalid:',
              algebraic(destSq),
            )
            this._history.pop()
            return // Invalid state
          }
          delete this._board[destSq]
          if (this.isHeroic(destSq)) this._setHeroic(destSq, false)
          move.captured = capturedPieceData.type
        }
        this._board[destSq] = pieceThatMoved // Place deployed piece
        // Heroic status of deployed piece? Assume non-heroic for now.
        finalSq = destSq
      }
      // Set deploy state for next move generation
      this._deployState = { stackSquare: move.from, turn: us }
    } else {
      // --- Handle Normal Move or Carrier Move ---
      pieceThatMoved = this._board[move.from] // The piece/stack being moved
      if (!pieceThatMoved) {
        console.error(
          'Attempting to move from empty square:',
          algebraic(move.from),
        )
        this._history.pop() // Remove invalid history entry
        return // Should not happen
      }
      const pieceWasHeroic = this.isHeroic(move.from) // Status of carrier/single piece

      // Handle Stay Capture vs Normal Capture/Move
      if (move.flags & BITS.STAY_CAPTURE) {
        const targetSq = move.to // 'to' stores the target square in this special case
        const capturedPiece = this._board[targetSq] // For clock reset check
        if (!capturedPiece || capturedPiece.color !== them) {
          console.error(
            'Stay capture target square is empty or has own piece:',
            algebraic(targetSq),
          )
          this._history.pop() // Remove invalid history entry
          return // Should not happen
        }
        delete this._board[targetSq]
        // Remove heroic status of captured piece
        if (this.isHeroic(targetSq)) this._setHeroic(targetSq, false)
        move.captured = capturedPiece.type // Ensure captured type is set
        // The moving piece stays at move.from
        finalSq = move.from
      } else {
        // Normal move/capture (could be single piece or carrier moving stack)
        const destSq = move.to
        const capturedPieceData = this._board[destSq] // Check destination for capture

        delete this._board[move.from]
        // Remove heroic status from source square (will be reapplied if needed)
        if (pieceWasHeroic) this._setHeroic(move.from, false)

        // Place piece/stack at destination
        this._board[destSq] = pieceThatMoved
        // Apply heroic status if it was heroic
        if (pieceWasHeroic) this._setHeroic(destSq, true)
        finalSq = destSq

        // Handle captured piece if any
        if (move.flags & BITS.CAPTURE) {
          if (!capturedPieceData || capturedPieceData.color !== them) {
            console.error(
              'Normal capture destination square is empty or has own piece:',
              algebraic(destSq),
            )
            // Allow overwriting own piece? No, standard rules usually forbid.
            this._history.pop() // Revert history
            return // Invalid state
          } else {
            move.captured = capturedPieceData.type // Set captured type
            // Remove heroic status of captured piece if it existed
            if (this.isHeroic(destSq) && !pieceWasHeroic) {
              // If a non-heroic piece captures a heroic piece, the heroic status is lost
              // This logic seems complex - does capturing a hero remove the capturer's hero status?
              // Assuming the captured piece's status is simply removed.
              // The capturer's status (pieceWasHeroic) is reapplied above.
              // Let's simplify: just ensure the destination square has the correct final status.
              if (!pieceWasHeroic) this._setHeroic(destSq, false) // Ensure non-heroic if capturer wasn't heroic
            } else if (this.isHeroic(destSq)) {
              // Ensure heroic status is removed from captured piece regardless of capturer status
              this._setHeroic(destSq, false)
            }
          }
        }

        // Update commander position if moved
        if (pieceThatMoved.type === COMMANDER) {
          this._kings[us] = destSq
        }
      }
      // Clear deploy state after a normal/carrier move
      this._deployState = null
    }

    // --- Update Clocks ---
    // Reset half move counter if capture or infantry/militia/engineer move (pawn-like)
    // Use pieceThatMoved which represents the piece whose action occurred (deployed piece or carrier/single piece)
    if (
      move.flags & BITS.CAPTURE ||
      pieceThatMoved.type === INFANTRY ||
      pieceThatMoved.type === MILITIA ||
      pieceThatMoved.type === ENGINEER
    ) {
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
    const pieceAtFinalSq = this._board[finalSq] // Get the piece that ended up there

    // Check for promotion conditions (e.g., putting opponent in check)
    // AND ensure the piece is not a Commander
    if (pieceAtFinalSq && pieceAtFinalSq.type !== COMMANDER) {
      // Temporarily switch turn to check opponent's king
      this._turn = them
      if (this._isKingAttacked(them)) {
        // If the move puts opponent in check
        if (!this.isHeroic(finalSq)) {
          // And the piece wasn't already heroic
          this._setHeroic(finalSq, true)
          becameHeroic = true
        }
      }
      this._turn = us // Switch back
    }
    // TODO: Check for last piece auto-promotion (also needs Commander check)

    // Update the move object in history if promotion occurred
    if (becameHeroic) {
      move.becameHeroic = true // Modify the move object directly (part of history)
      move.flags |= BITS.HEROIC_PROMOTION
      // Ensure the board reflects the new heroic status
      this._setHeroic(finalSq, true)
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

    const move = old.move
    const us = old.turn // The player who made the move being undone
    const them = swapColor(us)

    // Restore state from history entry BEFORE the move was made
    this._kings = old.kings
    this._turn = us
    this._halfMoves = old.halfMoves
    this._moveNumber = old.moveNumber
    // Restore heroic status snapshot - this is crucial
    this._heroicStatus = { ...old.heroicStatus }
    // Restore deploy state
    this._deployState = old.deployState

    // --- Revert Board Changes ---
    let pieceThatMoved: Piece | undefined = undefined // Track the piece whose action determines clock/turn
    let finalSq: number // Track the final square for promotion checks

    if (move.flags & BITS.DEPLOY) {
      // --- Undo Deploy Move ---
      const carrierPiece = this._board[move.from]
      if (!carrierPiece) {
        // This implies the carrier itself moved after deploy, which shouldn't happen in the same history entry?
        // Or maybe the carrier was captured? This needs careful state restoration.
        // For now, assume carrier is still there.
        console.error(
          'Cannot undo deploy: Carrier missing at',
          algebraic(move.from),
        )
        // Attempt to restore carrier based on history? Complex.
        return null // Cannot reliably undo
      }

      // The piece that was deployed
      let deployedPiece: Piece | undefined = undefined

      if (move.flags & BITS.STAY_CAPTURE) {
        // Deployed piece performed stay capture, it wasn't placed on board
        deployedPiece = { type: move.piece, color: us } // Recreate the piece
        // Restore captured piece at target square
        const targetSq = move.to
        if (move.captured) {
          // Need to know if the captured piece was heroic
          // We lost this info, assume non-heroic for now
          this._board[targetSq] = { type: move.captured, color: them }
          // Restore heroic status if it was in the snapshot
          if (old.heroicStatus[targetSq]) {
            this._setHeroic(targetSq, true)
          }
        }
      } else {
        // Normal deploy, piece was placed on board
        const destSq = move.to
        deployedPiece = this._board[destSq] // Get the piece from destination
        if (!deployedPiece || deployedPiece.type !== move.piece) {
          console.error(
            'Cannot undo deploy: Deployed piece missing/mismatch at',
            algebraic(destSq),
          )
          return null // Cannot reliably undo
        }
        delete this._board[destSq] // Remove from destination

        // Restore captured piece if any
        if (move.captured) {
          this._board[destSq] = { type: move.captured, color: them }
          if (old.heroicStatus[destSq]) {
            this._setHeroic(destSq, true)
          }
        }
      }

      // Add deployed piece back to carrier
      if (deployedPiece) {
        if (!carrierPiece.carried) {
          carrierPiece.carried = []
        }
        // Ensure not adding duplicates if undoing multiple times rapidly?
        // Check if already present (shouldn't be necessary with correct state management)
        if (
          !carrierPiece.carried.some(
            (p) =>
              p.type === deployedPiece!.type &&
              p.color === deployedPiece!.color,
          )
        ) {
          carrierPiece.carried.push(deployedPiece)
        }
      }
    } else if (move.flags & BITS.STAY_CAPTURE) {
      // --- Undo Normal Stay Capture ---
      // Piece that moved stayed at move.from, just restore captured
      const targetSq = move.to // Target square is stored in 'to'
      if (move.captured) {
        this._board[targetSq] = { type: move.captured, color: them }
        if (old.heroicStatus[targetSq]) {
          this._setHeroic(targetSq, true)
        }
      } else {
        // This case should ideally not happen for a capture flag
        delete this._board[targetSq]
      }
      // The piece at move.from was not moved, its state is restored by heroicStatus snapshot
    } else {
      // --- Undo Normal Move/Capture (Single piece or Carrier) ---
      const pieceThatMoved = this._board[move.to] // Get the piece/stack from destination
      if (!pieceThatMoved || pieceThatMoved.type !== move.piece) {
        console.error(
          'Cannot undo move: Piece missing/mismatch at destination',
          algebraic(move.to),
        )
        return null
      }

      delete this._board[move.to] // Remove from destination
      // Clear heroic at dest if it wasn't heroic before (restored from snapshot below)
      if (this.isHeroic(move.to) && !old.heroicStatus[move.to]) {
        this._setHeroic(move.to, false)
      }

      this._board[move.from] = pieceThatMoved // Move piece/stack back
      // Restore heroic at source from snapshot
      if (old.heroicStatus[move.from]) this._setHeroic(move.from, true)
      else this._setHeroic(move.from, false) // Ensure it's cleared if it wasn't heroic

      // Restore captured piece if any
      if (move.captured) {
        this._board[move.to] = { type: move.captured, color: them }
        if (old.heroicStatus[move.to]) {
          this._setHeroic(move.to, true)
        }
      }
    }

    // TODO: Decrement position count
    // this._decPositionCount(this.fen()); // Fen after undo

    return move
  }

  public undo(): void {
    this._undoMove()
  }

  // --- Check/Game Over Detection (Updated for Stay Capture) ---
  private _isKingAttacked(color: Color): boolean {
    const kingSq = this._kings[color]
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
    return this._isKingAttacked(this._turn)
  }

  isCheckmate(): boolean {
    // Checkmate = Commander is attacked AND no legal moves exist
    return this.isCheck() && this._moves({ legal: true }).length === 0
  }

  isStalemate(): boolean {
    // Stalemate = Commander is NOT attacked AND no legal moves exist
    return !this.isCheck() && this._moves({ legal: true }).length === 0
  }

  // TODO: Implement isInsufficientMaterial, isThreefoldRepetition, isDrawByFiftyMoves based on variant rules
  isDrawByFiftyMoves(): boolean {
    return this._halfMoves >= 100 // 50 moves per side
  }

  isDraw(): boolean {
    return this.isStalemate() || this.isDrawByFiftyMoves() // Add other draw conditions later (repetition, insufficient material)
  }

  isGameOver(): boolean {
    // Game over if checkmate, stalemate, draw, or commander captured
    return (
      this.isCheckmate() ||
      this.isDraw() ||
      this._kings[RED] === -1 ||
      this._kings[BLUE] === -1
    )
  }

  // --- SAN Parsing/Generation (Updated for Stay Capture & Deploy) ---
  private _moveToSan(move: InternalMove, moves: InternalMove[]): string {
    const pieceChar = move.piece.toUpperCase()
    const fromAlg = algebraic(move.from)
    let toAlg: string
    let san = ''

    // Heroic status determination is complex here as we need the state *before* the move.
    // The Move class constructor is better suited, but we'll approximate here for basic SAN.
    // We check the *current* board state, which is *after* the move for legality checks.
    // This means heroicPrefix might be wrong if the piece just moved *from* a heroic state.
    const pieceAtFrom = this._board[move.from] // Might be undefined if piece moved
    const pieceAtTo = this._board[move.to] // Might be the moved piece or captured piece target

    // Approximation: Check if the piece *involved* in the move was heroic *before* the move.
    // This requires looking into the history, which is complex here.
    // Let's use the Move class's logic as a reference for the final SAN string format.
    const heroicPrefix = this.isHeroic(move.from) ? '+' : '' // Simplified: Assume Move class handles this better
    const heroicSuffix = move.becameHeroic ? '+' : ''

    if (move.flags & BITS.DEPLOY) {
      // Deploy Move: (Stack)PieceFrom>To, (Stack)PieceFrom>xTo, (Stack)PieceFrom<Target
      const stackRep = '(?)' // Placeholder - needs previous state info
      if (move.flags & BITS.STAY_CAPTURE) {
        toAlg = algebraic(move.to) // Target square
        san = `${stackRep}${heroicPrefix}${pieceChar}${fromAlg}<${toAlg}${heroicSuffix}`
      } else {
        toAlg = algebraic(move.to) // Destination square
        const separator = move.flags & BITS.CAPTURE ? '>x' : '>'
        san = `${stackRep}${heroicPrefix}${pieceChar}${fromAlg}${separator}${toAlg}${heroicSuffix}`
      }
    } else if (move.flags & BITS.STAY_CAPTURE) {
      // Normal Stay Capture: PieceFrom<Target
      toAlg = algebraic(move.to) // Target square
      // Heroic prefix should reflect status of piece at 'from' before move
      const approxHeroicBefore = this.isHeroic(move.from) ? '+' : '' // Approximation
      san = `${approxHeroicBefore}${pieceChar}${fromAlg}<${toAlg}${heroicSuffix}`
    } else {
      // Normal Move/Capture: PieceFrom-To or PieceFromxTo
      toAlg = algebraic(move.to) // Destination square
      const separator = move.flags & BITS.CAPTURE ? 'x' : '-'
      // Heroic prefix should reflect status of piece at 'from' before move
      const approxHeroicBefore = this.isHeroic(move.from) ? '+' : '' // Approximation
      san = `${approxHeroicBefore}${pieceChar}${fromAlg}${separator}${toAlg}${heroicSuffix}`
    }

    // TODO: Add ambiguity resolution (e.g., Taf1-f3 vs Tbf1-f3)
    // Need to check if other pieces of the same type can move to the same square
    let disambiguator = ''
    // Basic ambiguity check (only file/rank if needed)
    // ... implementation needed ...

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
      | { from: string; to: string; stay?: boolean /* promotion?: string */ },
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

        if (targetSquareInternal === toSq) {
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

    const pieceWasHeroic = this.isHeroic(internalMove.from) // Get status before making move
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

    const prettyMove = new Move(this, savedMove, pieceWasHeroic)

    // Manually set FENs on the prettyMove object
    prettyMove.before = fenBeforeMove // FEN before this move was made
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
            heroic: this.isHeroic(sq),
          })
        } else {
          row.push(null)
        }
      }
      output.push(row)
    }
    return output
  }

  squareColor(square: Square): 'light' | 'dark' | null {
    if (!(square in SQUARE_MAP)) return null
    const sq = SQUARE_MAP[square]
    return (rank(sq) + file(sq)) % 2 === 0 ? 'light' : 'dark'
  }

  history({ verbose = false }: { verbose?: boolean } = {}): string[] | Move[] {
    const moveHistory: (string | Move)[] = []
    const FENHistory: string[] = [] // Store FENs to reconstruct Moves correctly
    const gameCopy = new CoTuLenh(this.fen()) // Create a copy to manipulate

    // Get FEN at the start of the actual history
    const reversedMoves: InternalMove[] = []
    while (gameCopy._history.length > 0) {
      const undoneMove = gameCopy._undoMove()
      if (undoneMove) {
        reversedMoves.push(undoneMove) // Store the undone move
      }
    }
    const startFEN = gameCopy.fen() // FEN at the beginning
    FENHistory.push(startFEN)
    reversedMoves.reverse() // Put moves back in chronological order

    // Replay moves on the copy to build history output
    // We need the original history entries for heroic status context
    for (let i = 0; i < this._history.length; i++) {
      const historyEntry = this._history[i] // Get original history entry
      const internalMove = historyEntry.move
      const pieceWasHeroic = historyEntry.heroicStatus[internalMove.from] // Status before the move

      // Make move on the copy to get state *after*
      // Use the move from the original history entry
      gameCopy._makeMove(internalMove)
      const fenAfter = gameCopy.fen()
      FENHistory.push(fenAfter) // Store FEN after the move

      if (verbose) {
        // Create Move object using the state *after* the move was made
        const moveObj = new Move(gameCopy, internalMove, pieceWasHeroic)
        // Manually set before/after FENs from our collected history
        moveObj.before = FENHistory[FENHistory.length - 2] // FEN before this move
        moveObj.after = fenAfter // FEN after this move
        moveHistory.push(moveObj)
      } else {
        // Generate SAN for the state *before* the move was made
        // Need to use the state *before* this move for legality checks
        const tempGame = new CoTuLenh(FENHistory[FENHistory.length - 2]) // Load state before
        const movesForSAN = tempGame._moves({ legal: true }) // Get all legal moves in that state
        moveHistory.push(tempGame._moveToSan(internalMove, movesForSAN)) // Generate SAN
      }
    }

    return moveHistory as any // Cast based on verbose flag
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
    const ranks: { [key: number]: string[] } = {}

    // Group squares by their display rank (12 down to 1)
    for (const [alg, sq] of Object.entries(SQUARE_MAP)) {
      const displayRank = 12 - rank(sq)
      if (!ranks[displayRank]) ranks[displayRank] = []
      ranks[displayRank].push(alg)
    }

    console.log('\nCurrent Board:')

    // Print from rank 12 (top) to 1 (bottom)
    for (let dr = 12; dr >= 1; dr--) {
      let line = `${dr}`.padStart(2, ' ') + ' '
      for (const alg of ranks[dr] || []) {
        const sq = SQUARE_MAP[alg as Square]
        const piece = this._board[sq]
        const isNavyZone = NAVY_MASK[sq] && !LAND_MASK[sq] // Pure navy (a, b files usually)
        const isMixedZone = NAVY_MASK[sq] && LAND_MASK[sq] // c file and river banks d6,e6,d7,e7
        const isBridge = ['f6', 'f7', 'h6', 'h7'].includes(alg)

        let bgCode = ''
        let fgCode = piece
          ? piece.color === RED
            ? '\x1b[31m'
            : '\x1b[34m'
          : ''

        // Use fixed-width display for all pieces (heroic or not)
        let symbol = ' '
        if (piece) {
          symbol = this.isHeroic(sq)
            ? '+' + piece.type.toUpperCase()
            : ' ' + piece.type.toUpperCase()
        } else {
          symbol = ' ·'
        }

        if (isBridge) {
          bgCode = piece ? '\x1b[43m' : '\x1b[47m' // Yellow if piece, White if empty
        } else if (isMixedZone) {
          bgCode = '\x1b[48;5;231m' // Cyan
        } else if (isNavyZone) {
          bgCode = '\x1b[48;5;159m' // Blue
        }
        // Pure Land zones have no bgCode

        if (bgCode) {
          // Apply background and foreground colors
          line += `${bgCode}${fgCode}${symbol}\x1b[0m${bgCode} \x1b[0m` // Add space with bg color
        } else {
          // No background, just foreground for piece or symbol for empty
          line += piece ? `${fgCode}${symbol}\x1b[0m ` : `${symbol} `
        }
      }
      console.log(line)
      // Add a separator line between rank 7 (dr=7) and rank 6 (dr=6)
      if (dr === 7) {
        console.log('   --------------------------------') // Adjust length as needed
      }
    }
    // Update the file labels to align with the 2-character piece display
    console.log('    a  b  c  d  e  f  g  h  i  j  k')
  }

  // TODO: getComments, removeComments need pruning logic like chess.js if history is mutable
}

// Helper function to add a move to the list
// Updated for Stay Capture logic
function addMove(
  moves: InternalMove[],
  color: Color,
  from: number,
  to: number, // Destination square for normal move, Target square for stay capture
  piece: PieceSymbol,
  captured: PieceSymbol | undefined = undefined,
  flags: number = BITS.NORMAL,
) {
  // No piece promotion in this variant based on rules
  const moveToAdd: InternalMove = { color, from, to, piece, captured, flags }
  // 'to' correctly represents destination or target based on flag context in _moves
  moves.push(moveToAdd)
}
