import {
  Piece,
  PieceSymbol,
  Color,
  InternalMove,
  RED,
  Square,
  COMMANDER,
  BLUE,
  INFANTRY,
  NAVY,
  AIR_FORCE,
  TANK,
  MILITIA,
  ENGINEER,
  ARTILLERY,
  ANTI_AIR,
  MISSILE,
  HEADQUARTER,
} from '../src/type'
import { CoTuLenh, MoveResult } from '../src/cotulenh'

// =============================================================================
// VALIDATION: Stack Rules (from blueprints.yaml)
// =============================================================================

type SlotRule = PieceSymbol[]

const VALID_STACKS: Record<PieceSymbol, SlotRule[]> = {
  [NAVY]: [[AIR_FORCE], [COMMANDER, INFANTRY, MILITIA, TANK]],
  [TANK]: [[COMMANDER, INFANTRY, MILITIA]],
  [ENGINEER]: [[ARTILLERY, ANTI_AIR, MISSILE]],
  [AIR_FORCE]: [[TANK], [COMMANDER, INFANTRY, MILITIA]],
  [HEADQUARTER]: [[COMMANDER]],
  // Non-carriers have no slots
  [COMMANDER]: [],
  [INFANTRY]: [],
  [MILITIA]: [],
  [ARTILLERY]: [],
  [ANTI_AIR]: [],
  [MISSILE]: [],
}

function validateStack(carrierType: PieceSymbol, carrying: Piece[]): void {
  const slots = VALID_STACKS[carrierType]

  if (!slots || slots.length === 0) {
    throw new Error(
      `[TEST SETUP ERROR] ${carrierType.toUpperCase()} cannot carry any pieces. ` +
        `Check blueprints.yaml for valid carriers.`,
    )
  }

  if (carrying.length > slots.length) {
    throw new Error(
      `[TEST SETUP ERROR] ${carrierType.toUpperCase()} can only carry ${slots.length} piece(s), ` +
        `but ${carrying.length} were provided.`,
    )
  }

  // For single piece, check if it fits ANY slot (allows sparse stacking)
  if (carrying.length === 1) {
    const piece = carrying[0]
    const fitsAnySlot = slots.some((slotRules) =>
      slotRules.includes(piece.type),
    )
    if (!fitsAnySlot) {
      throw new Error(
        `[TEST SETUP ERROR] ${carrierType.toUpperCase()} cannot carry ${piece.type.toUpperCase()} in any slot. ` +
          `Valid slots: ${slots.map((s, i) => `Slot ${i + 1}: [${s.map((t) => t.toUpperCase()).join(', ')}]`).join('; ')}. ` +
          `Check blueprints.yaml.`,
      )
    }
    return
  }

  // For multiple pieces, validate each against its positional slot
  for (let i = 0; i < carrying.length; i++) {
    const piece = carrying[i]
    const allowedInSlot = slots[i]

    if (!allowedInSlot.includes(piece.type)) {
      throw new Error(
        `[TEST SETUP ERROR] ${carrierType.toUpperCase()} slot ${i + 1} cannot carry ${piece.type.toUpperCase()}. ` +
          `Allowed: [${allowedInSlot.map((t) => t.toUpperCase()).join(', ')}]. ` +
          `Check blueprints.yaml.`,
      )
    }
  }
}

// =============================================================================
// VALIDATION: Terrain Rules
// =============================================================================

const PURE_NAVY_FILES = ['a', 'b']
const MIXED_ZONE_FILE = 'c'
const RIVER_SQUARES: Square[] = ['d6', 'e6', 'd7', 'e7']

function isNavyZone(square: Square): boolean {
  const file = square[0]
  return (
    PURE_NAVY_FILES.includes(file) ||
    file === MIXED_ZONE_FILE ||
    RIVER_SQUARES.includes(square)
  )
}

function isPureNavyZone(square: Square): boolean {
  return PURE_NAVY_FILES.includes(square[0])
}

function isLandZone(square: Square): boolean {
  const file = square[0]
  return file >= 'c' && file <= 'k'
}

function validateTerrain(pieceType: PieceSymbol, square: Square): void {
  if (pieceType === AIR_FORCE) {
    return // Air Force can go anywhere
  }

  if (pieceType === NAVY) {
    if (!isNavyZone(square)) {
      throw new Error(
        `[TEST SETUP ERROR] NAVY cannot be placed on ${square} (pure land zone). ` +
          `Navy can only be on files a-c or river squares (d6, e6, d7, e7).`,
      )
    }
    return
  }

  // All other pieces are land units
  if (isPureNavyZone(square)) {
    throw new Error(
      `[TEST SETUP ERROR] ${pieceType.toUpperCase()} cannot be placed on ${square} (pure navy zone). ` +
        `Land units can only be on files c-k.`,
    )
  }
}

// =============================================================================
// PIECE CREATION WITH VALIDATION
// =============================================================================

/**
 * Create a Piece object for testing.
 * Validates stack combinations against blueprints.yaml rules.
 * Throws if invalid stack is attempted.
 */
export function makePiece(
  type: PieceSymbol,
  color: Color = RED,
  heroic: boolean = false,
  carrying: Piece[] = [],
): Piece {
  if (carrying.length > 0) {
    validateStack(type, carrying)
  }

  return {
    type,
    color,
    heroic,
    ...(carrying.length > 0 ? { carrying } : {}),
  }
}

/**
 * Place a piece on the board with terrain validation.
 * Throws if piece type cannot legally occupy the square.
 */
export function placeAt(game: CoTuLenh, piece: Piece, square: Square): void {
  validateTerrain(piece.type, square)
  game.put(piece, square)
}

/**
 * Create an InternalMove object for testing
 * Requires at least a piece. Other fields can be overridden.
 */
export function makeMove(
  params: Partial<InternalMove> & { piece: Piece },
): InternalMove {
  return {
    color: params.color ?? 'r',
    from: params.from ?? 0,
    to: params.to ?? 1,
    piece: params.piece,
    flags: params.flags ?? 1,
    captured: params.captured,
    combined: params.combined,
  }
}

export function setupGameBasic(): CoTuLenh {
  const game = new CoTuLenh()
  game.clear()
  game.put({ type: COMMANDER, color: RED }, 'f1')
  game.put({ type: COMMANDER, color: BLUE }, 'g12')
  game.put({ type: INFANTRY, color: RED }, 'k1')
  game.put({ type: INFANTRY, color: BLUE }, 'k12')
  return game
}

// Simplified helper to check if a move exists in the verbose list
// (We don't need all options of findVerboseMove for these basic tests)
export const findMove = (
  moves: MoveResult[],
  from: Square,
  to: Square,
): MoveResult | undefined => {
  return moves.find((m) => {
    let mTo: Square | undefined
    if (m.isDeploy) {
      const toValue = m.to
      if (typeof toValue === 'string') {
        // Single deploy move
        mTo = toValue === to ? to : undefined
      } else {
        // Deploy sequence with Map
        const toMap = toValue as Map<Square, Piece>
        if (toMap.has(to)) {
          mTo = to
        }
      }
    } else {
      mTo = m.to as Square
    }
    return m.from === from && mTo === to
  })
}

// Helper to extract just the 'to' squares for simple comparison
export const getDestinationSquares = (moves: MoveResult[]): Square[] => {
  return moves
    .flatMap((m) => {
      if (m.isDeploy) {
        const toValue = m.to
        if (typeof toValue === 'string') {
          return [toValue as Square]
        }
        return Array.from((toValue as Map<Square, Piece>).keys()) as Square[]
      }
      return [m.to as Square]
    })
    .sort()
}

// Helper to find a specific move in the verbose move list
export const findVerboseMove = (
  moves: MoveResult[],
  from: Square,
  to: Square, // Destination or Target
  options: {
    piece?: PieceSymbol
    isDeploy?: boolean
    isStayCapture?: boolean // Option parameter
  } = {},
): MoveResult | undefined => {
  return moves.find((m) => {
    const matchFrom = m.from === from

    let matchTo = false
    // For deploy moves, 'to' can be either a Map (for completed sequences) or Square (for individual moves)
    if (m.isDeploy) {
      const toValue = m.to
      if (typeof toValue === 'string') {
        // Single deploy move
        matchTo = toValue === to
      } else {
        // Deploy sequence with Map
        matchTo = (toValue as Map<Square, Piece>).has(to)
      }
    } else {
      matchTo = (m.to as Square) === to
    }

    const matchPieceType =
      options.piece === undefined || m.piece.type === options.piece
    const matchDeploy =
      options.isDeploy === undefined || m.isDeploy === options.isDeploy
    const matchStayCapture =
      options.isStayCapture === undefined ||
      (m.captured !== undefined && m.isStayCapture === options.isStayCapture)

    return (
      matchFrom && matchPieceType && matchDeploy && matchStayCapture && matchTo
    )
  })
}
