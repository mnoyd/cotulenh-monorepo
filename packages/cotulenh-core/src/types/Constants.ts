/**
 * Constants and enums for CoTuLenh
 */

// Colors
export const RED = 'r' as const
export const BLUE = 'b' as const

export type Color = typeof RED | typeof BLUE

// Piece types
export const COMMANDER = 'c' as const
export const INFANTRY = 'i' as const
export const TANK = 't' as const
export const MILITIA = 'm' as const
export const ENGINEER = 'e' as const
export const ARTILLERY = 'a' as const
export const ANTI_AIR = 'g' as const
export const MISSILE = 's' as const
export const AIR_FORCE = 'f' as const
export const NAVY = 'n' as const
export const HEADQUARTER = 'h' as const

export type PieceSymbol =
  | typeof COMMANDER
  | typeof INFANTRY
  | typeof TANK
  | typeof MILITIA
  | typeof ENGINEER
  | typeof ARTILLERY
  | typeof ANTI_AIR
  | typeof MISSILE
  | typeof AIR_FORCE
  | typeof NAVY
  | typeof HEADQUARTER

// Piece type constants array
export const PIECE_TYPES: readonly PieceSymbol[] = [
  COMMANDER,
  INFANTRY,
  TANK,
  MILITIA,
  ENGINEER,
  ARTILLERY,
  ANTI_AIR,
  MISSILE,
  AIR_FORCE,
  NAVY,
  HEADQUARTER,
] as const

// Heavy pieces (restricted river crossing)
export const HEAVY_PIECES = new Set<PieceSymbol>([ARTILLERY, ANTI_AIR, MISSILE])

// Board dimensions
export const BOARD_FILES = 11
export const BOARD_RANKS = 12
export const BOARD_STRIDE = 16 // 16x16 mailbox
export const BOARD_SIZE = 256 // Total array size

// Direction offsets for 16x16 mailbox
export const NORTH = -16
export const SOUTH = 16
export const EAST = 1
export const WEST = -1
export const NORTH_EAST = -15
export const NORTH_WEST = -17
export const SOUTH_EAST = 17
export const SOUTH_WEST = 15

export const ORTHOGONAL_DIRECTIONS = [NORTH, SOUTH, EAST, WEST] as const
export const DIAGONAL_DIRECTIONS = [
  NORTH_EAST,
  NORTH_WEST,
  SOUTH_EAST,
  SOUTH_WEST,
] as const
export const ALL_DIRECTIONS = [
  ...ORTHOGONAL_DIRECTIONS,
  ...DIAGONAL_DIRECTIONS,
] as const

// Move flags (bit flags)
export const MOVE_FLAG_NORMAL = 1
export const MOVE_FLAG_CAPTURE = 2
export const MOVE_FLAG_STAY_CAPTURE = 4
export const MOVE_FLAG_SUICIDE_CAPTURE = 8
export const MOVE_FLAG_DEPLOY = 16
export const MOVE_FLAG_COMBINATION = 32

export const CAPTURE_FLAGS =
  MOVE_FLAG_CAPTURE | MOVE_FLAG_STAY_CAPTURE | MOVE_FLAG_SUICIDE_CAPTURE
