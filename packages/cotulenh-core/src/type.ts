// --- Constants ---
export const RED = 'r'
export const BLUE = 'b'

// Piece Symbols based on user input
export const COMMANDER = 'c'
export const INFANTRY = 'i'
export const TANK = 't'
export const MILITIA = 'm'
export const ENGINEER = 'e'
export const ARTILLERY = 'a'
export const ANTI_AIR = 'g'
export const MISSILE = 's'
export const AIR_FORCE = 'f'
export const NAVY = 'n'
export const HEADQUARTER = 'h'

// Centralized valid piece types set for validation
export const VALID_PIECE_TYPES: Record<string, true> = {
  [COMMANDER]: true,
  [INFANTRY]: true,
  [TANK]: true,
  [MILITIA]: true,
  [ENGINEER]: true,
  [ARTILLERY]: true,
  [ANTI_AIR]: true,
  [MISSILE]: true,
  [AIR_FORCE]: true,
  [NAVY]: true,
  [HEADQUARTER]: true,
}

export const HEAVY_PIECES = new Set([ARTILLERY, ANTI_AIR, MISSILE])

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
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m3i/11/11/2IE2M3I/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1'

export type Piece = {
  color: Color
  type: PieceSymbol
  carrying?: Piece[] // Array to hold carrying pieces (excluding the carrier itself)
  heroic?: boolean // Indicates if the piece has heroic status
}

// --- 0x88 Style Board Representation (Adapted for 16x16) ---
// We use a 16x16 board (256 squares) to fit 11x12
// Square 0 = a12, Square 1 = b12, ..., Square 10 = k12
// Square 16 = a11, ..., Square 26 = k11
// ...
// Square 176 = a1, ..., Square 186 = k1

//prettier-ignore
export const SQUARE_MAP: Record<Square, number> = {
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

export const NAVY_MASK = new Uint8Array(256) // 1 = navigable by navy
export const LAND_MASK = new Uint8Array(256) // 1 = accessible by light pieces

// Initialize movement masks
function initMovementMasks() {
  for (let sq = 0; sq < 256; sq++) {
    if (!isSquareOnBoard(sq)) continue // Add validity check
    const f = file(sq)
    const r = rank(sq)

    // Navy operational areas (a-c files + specific squares)
    NAVY_MASK[sq] =
      f <= 2 || ((f === 3 || f === 4) && (r === 5 || r === 6)) ? 1 : 0

    // Land pieces operational areas (c-k files)
    LAND_MASK[sq] = f >= 2 ? 1 : 0
  }
}
initMovementMasks()

// --- Helper Functions ---

// Check if a square index is on the 11x12 board within the 16x16 grid
export function isSquareOnBoard(sq: number): boolean {
  const r = rank(sq)
  const f = file(sq)
  return r >= 0 && r < 12 && f >= 0 && f < 11
}

// Extracts the zero-based rank (0-11) from a 0x88 square index.
export function rank(square: number): number {
  return square >> 4
}

// Extracts the zero-based file (0-10) from a 0x88 square index.
export function file(square: number): number {
  return square & 0xf
}

// Converts a square index to algebraic notation (e.g., 0 -> a12, 186 -> k1).
export function algebraic(square: number): Square {
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

export function swapColor(color: Color): Color {
  return color === RED ? BLUE : RED // Updated swapColor
}

export function isDigit(c: string): boolean {
  return '0123456789'.indexOf(c) !== -1
}
// --- Move Flags ---
export const FLAGS: Record<string, string> = {
  NORMAL: 'n',
  CAPTURE: 'c',
  STAY_CAPTURE: 's', // General flag for capturing without moving
  DEPLOY: 'd', // Flag for deploy move
  COMBINATION: 'b', // Flag for combination move
}

export const BITS: Record<string, number> = {
  NORMAL: 1,
  CAPTURE: 2,
  STAY_CAPTURE: 4, // General flag bit
  DEPLOY: 8, // Added deploy bit
  COMBINATION: 16, // Added combination bit
}
// --- Move/History Types ---
// Internal representation of a move
export type InternalMove = {
  color: Color
  from: number // 0x88 index
  to: number // 0x88 index (destination OR target square for stay capture)
  piece: Piece // The piece being moved (or deployed)
  captured?: Piece
  combined?: Piece
  flags: number // Bitmask using BITS
}
export type DeployState = {
  stackSquare: number
  turn: Color
  originalPiece: Piece
  movedPieces: Piece[]
  stay?: Piece[]
}
export type AirDefenseForSide = Map<number, number[]>
//For generating moves for air_force
export type AirDefense = {
  [RED]: AirDefenseForSide
  [BLUE]: AirDefenseForSide
}
//For exporting board display
export type AirDefenseInfluence = {
  [RED]: Map<Square, Square[]>
  [BLUE]: Map<Square, Square[]>
}
