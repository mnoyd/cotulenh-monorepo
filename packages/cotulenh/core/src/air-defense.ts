/**
 * Air Defense System for CoTuLenh Chess Variant
 *
 * ORGANIZATION BY DOMAIN:
 *
 * 1. BITBOARD INFRASTRUCTURE
 *    - Mapping between 0x88 squares and bit indices
 *    - Precomputed influence zone masks for performance
 *    - Bitboard conversion utilities
 *
 * 2. AIR DEFENSE RULES & CONFIGURATION
 *    - Which pieces provide air defense
 *    - Defense level calculations (base + heroic)
 *    - Piece scanning on the board
 *
 * 3. INFLUENCE ZONE CALCULATION
 *    - Pure geometry: circular radius calculations
 *    - Zone computation for individual pieces
 *    - Zone aggregation for entire side
 *
 * 4. BOARD STATE MANAGEMENT
 *    - Building complete air defense maps
 *    - Converting to algebraic notation
 *
 * 5. MOVEMENT VALIDATION
 *    - Air Force movement checking through defense zones
 *    - Kamikaze vs destroyed detection
 */

import { CoTuLenh } from './cotulenh.js'
import {
  AirDefenseForSide,
  ANTI_AIR,
  BLUE,
  isSquareOnBoard,
  MISSILE,
  NAVY,
  PieceSymbol,
  RED,
  Color,
  AirDefenseInfluence,
  Square,
  algebraic,
  AirDefense,
  VALID_SQUARES,
} from './type.js'

// ========================================================================
// BITBOARD INFRASTRUCTURE - Fast Lookup Tables
// ========================================================================

/**
 * Board dimensions for bitboard calculations
 * We use a packed bitboard representation for the 11x12 board
 */
const BOARD_WIDTH = 11
const BOARD_HEIGHT = 12
const MAX_BIT_INDEX = BOARD_WIDTH * BOARD_HEIGHT - 1 // 131

/**
 * Mapping tables between 0x88 square indices and packed bit indices
 * - 0x88 format: used by the game engine (256 elements, some invalid)
 * - Bit index: compact 0-131 range for bitboard operations
 */
const SQ_TO_BIT_INDEX: number[] = new Array(256).fill(-1)
const BIT_INDEX_TO_SQ: number[] = new Array(MAX_BIT_INDEX + 1).fill(0)

/**
 * Initialize bidirectional mapping between square formats
 */
function initBitboardMapping(): void {
  for (let idx = 0; idx < VALID_SQUARES.length; idx++) {
    const sq = VALID_SQUARES[idx]
    SQ_TO_BIT_INDEX[sq] = idx
    BIT_INDEX_TO_SQ[idx] = sq
  }
}

initBitboardMapping()

/**
 * Precomputed air defense zone masks for fast lookups
 * Indexed by [level][bitIndex] → bitboard mask
 *
 * Example: AIR_DEFENSE_MASKS[2][50] = mask for level-2 defense at bit index 50
 */
const MAX_DEFENSE_LEVEL = 4
const AIR_DEFENSE_MASKS: bigint[][] = Array.from(
  { length: MAX_DEFENSE_LEVEL + 1 },
  () => [],
)

/**
 * Precompute all air defense zone masks for fast lookups
 * Uses circular distance formula: x² + y² ≤ level²
 */
function initAirDefenseMasks(): void {
  for (let level = 1; level <= MAX_DEFENSE_LEVEL; level++) {
    for (const sq of VALID_SQUARES) {
      const bitIndex = SQ_TO_BIT_INDEX[sq]
      let mask = 0n

      // Check all squares within bounding box
      for (let dx = -level; dx <= level; dx++) {
        for (let dy = -level; dy <= level; dy++) {
          const targetSq = sq + dx + dy * 16 // 0x88 offset arithmetic

          if (!isSquareOnBoard(targetSq)) continue

          // Circular distance check
          if (dx * dx + dy * dy <= level * level) {
            const targetBitIndex = SQ_TO_BIT_INDEX[targetSq]
            if (targetBitIndex !== -1) {
              mask |= 1n << BigInt(targetBitIndex)
            }
          }
        }
      }

      AIR_DEFENSE_MASKS[level][bitIndex] = mask
    }
  }
}

initAirDefenseMasks()

/**
 * Convert bitboard to array of 0x88 square indices
 * Optimized: O(k) where k = number of set bits
 */
function bitboardToSquares(bitboard: bigint): number[] {
  const squares: number[] = []
  let temp = bitboard
  let bitIndex = 0

  while (temp !== 0n) {
    if (temp & 1n) {
      squares.push(BIT_INDEX_TO_SQ[bitIndex])
    }
    temp >>= 1n
    bitIndex++
  }

  return squares
}

// ========================================================================
// AIR DEFENSE RULES & CONFIGURATION
// ========================================================================

/**
 * Base air defense levels for each piece type
 * - Missile: level 2 (long range)
 * - Navy: level 1 (short range)
 * - Anti-Air: level 1 (short range)
 */
export const BASE_AIRDEFENSE_CONFIG: Partial<Record<PieceSymbol, number>> = {
  [MISSILE]: 2,
  [NAVY]: 1,
  [ANTI_AIR]: 1,
}

/**
 * Calculate air defense level for a piece
 * Heroic pieces get +1 level bonus
 */
function getAirDefenseLevel(piece: PieceSymbol, isHero: boolean): number {
  const baseLevel = BASE_AIRDEFENSE_CONFIG[piece]
  if (!baseLevel) return 0

  return isHero ? baseLevel + 1 : baseLevel
}

/**
 * Internal type for tracking air defense piece positions by color
 */
type AirDefensePiecesPosition = {
  [RED]: number[]
  [BLUE]: number[]
}

/**
 * Scan board and collect all air defense piece positions by color
 */
function scanAirDefensePieces(game: CoTuLenh): AirDefensePiecesPosition {
  const positions: AirDefensePiecesPosition = {
    [RED]: [],
    [BLUE]: [],
  }

  for (const sq of VALID_SQUARES) {
    const piece = game.get(sq)
    if (!piece) continue

    if (BASE_AIRDEFENSE_CONFIG[piece.type]) {
      positions[piece.color].push(sq)
    }
  }

  return positions
}

// ========================================================================
// INFLUENCE ZONE CALCULATION - Pure Geometry
// ========================================================================

/**
 * Calculate influence zone for a single square at given defense level
 * Uses precomputed bitboard masks for O(1) lookup
 *
 * @param square - 0x88 square index of the air defense piece
 * @param level - Defense level (1-4, max 3 in practice)
 * @returns Array of protected square indices
 */
export function calculateAirDefenseForSquare(
  square: number,
  level: number,
): number[] {
  if (level <= 0 || level > MAX_DEFENSE_LEVEL) {
    return []
  }

  const bitIndex = SQ_TO_BIT_INDEX[square]
  if (bitIndex === -1) return [] // Invalid square

  // Fast bitboard lookup - O(k) where k = number of protected squares
  const mask = AIR_DEFENSE_MASKS[level][bitIndex]
  return bitboardToSquares(mask)
}

/**
 * Calculate complete air defense map for one side
 * Maps each protected square to the list of pieces protecting it
 *
 * @param game - Game instance
 * @param color - Side to calculate defense for
 * @param positions - Positions of air defense pieces
 * @returns Map: protected square → array of defender positions
 */
function calculateAirDefenseForSide(
  game: CoTuLenh,
  color: Color,
  positions: AirDefensePiecesPosition,
): AirDefenseForSide {
  const defenseMap: AirDefenseForSide = new Map<number, number[]>()

  for (const squareIndex of positions[color]) {
    const piece = game.get(squareIndex)
    if (!piece) {
      throw new Error(`Air defense piece not found at square ${squareIndex}`)
    }

    const level = getAirDefenseLevel(piece.type, piece.heroic ?? false)
    if (level <= 0) continue

    const influenceSquares = calculateAirDefenseForSquare(squareIndex, level)

    // For each influenced square, record this defender
    for (const protectedSquare of influenceSquares) {
      if (!defenseMap.has(protectedSquare)) {
        defenseMap.set(protectedSquare, [])
      }
      defenseMap.get(protectedSquare)!.push(squareIndex)
    }
  }

  return defenseMap
}

// ========================================================================
// BOARD STATE MANAGEMENT - Building Defense Maps
// ========================================================================

/**
 * Build complete air defense map for both sides from current board state
 * This is the main entry point for updating air defense state
 *
 * @param game - Current game instance
 * @returns Complete air defense map for both RED and BLUE
 */
export function updateAirDefensePiecesPosition(game: CoTuLenh): AirDefense {
  // Step 1: Scan board for air defense pieces
  const positions = scanAirDefensePieces(game)

  // Step 2: Calculate influence zones for each side
  const airDefense: AirDefense = {
    [RED]: calculateAirDefenseForSide(game, RED, positions),
    [BLUE]: calculateAirDefenseForSide(game, BLUE, positions),
  }

  return airDefense
}

/**
 * Convert air defense map to algebraic notation for display/debugging
 *
 * @param game - Game instance with air defense data
 * @returns Map using algebraic square names (e.g., "e4")
 */
export function getAirDefenseInfluence(game: CoTuLenh): AirDefenseInfluence {
  const airDefenseInfluence: AirDefenseInfluence = {
    [RED]: new Map<Square, Square[]>(),
    [BLUE]: new Map<Square, Square[]>(),
  }

  const airDefense = game.getAirDefense()

  for (const color of Object.keys(airDefense) as Color[]) {
    for (const [squareIndex, defenderIndices] of airDefense[color]) {
      const square = algebraic(squareIndex)
      if (!square) throw new Error(`Invalid square index: ${squareIndex}`)

      airDefenseInfluence[color].set(
        square,
        defenderIndices.map(algebraic) as Square[],
      )
    }
  }

  return airDefenseInfluence
}

// ========================================================================
// MOVEMENT VALIDATION - Air Force Movement Through Defense Zones
// ========================================================================

/**
 * Air defense zone penetration results
 *
 * SAFE_PASS: No defense encountered, move freely
 * KAMIKAZE: First defense zone - can sacrifice to capture
 * DESTROYED: Multiple zones or re-entering - movement blocked
 */
export const AirDefenseResult = {
  SAFE_PASS: 0,
  KAMIKAZE: 1,
  DESTROYED: 2,
} as const

export type AirDefenseResultType =
  (typeof AirDefenseResult)[keyof typeof AirDefenseResult]

/**
 * Air Force movement validator
 * Tracks cumulative defense zone encounters during ray-casting
 *
 * Rules:
 * - No defense zones: SAFE_PASS
 * - Single defense zone (first encounter): KAMIKAZE (suicide capture allowed)
 * - Multiple defense zones OR exiting then re-entering: DESTROYED (blocked)
 */
class AirForceMovementChecker {
  private currentSquare: number
  private readonly offset: number
  private readonly airDefense: AirDefenseForSide
  private readonly encounterredDefenseZones: Set<number>
  private movedOutOfFirstZone: boolean
  private result: AirDefenseResultType

  constructor(
    fromSquare: number,
    offset: number,
    airDefense: AirDefenseForSide,
  ) {
    this.currentSquare = fromSquare
    this.offset = offset
    this.airDefense = airDefense
    this.encounterredDefenseZones = new Set<number>()
    this.movedOutOfFirstZone = false
    this.result = AirDefenseResult.SAFE_PASS
  }

  /**
   * Check next square in the ray
   * Call this for each square along the Air Force's movement path
   *
   * @returns Current air defense result for this square
   */
  check(): AirDefenseResultType {
    // Once destroyed, stay destroyed
    if (this.result === AirDefenseResult.DESTROYED) {
      return this.result
    }

    // Move to next square
    this.currentSquare += this.offset

    // Get defenders protecting this square
    const defenders = this.airDefense.get(this.currentSquare) || []

    if (defenders.length > 0) {
      // Track all defense zones we've encountered
      defenders.forEach((defenderSq) =>
        this.encounterredDefenseZones.add(defenderSq),
      )
    } else {
      // Empty square - check if we left a defense zone
      if (this.encounterredDefenseZones.size > 0) {
        this.movedOutOfFirstZone = true
      }
    }

    // Determine result based on zone history
    this.result = this.calculateResult()
    return this.result
  }

  /**
   * Calculate movement result based on defense zone encounters
   */
  private calculateResult(): AirDefenseResultType {
    const zoneCount = this.encounterredDefenseZones.size

    if (zoneCount === 0) {
      return AirDefenseResult.SAFE_PASS
    }

    if (zoneCount === 1 && !this.movedOutOfFirstZone) {
      // Still in first defense zone - kamikaze allowed
      return AirDefenseResult.KAMIKAZE
    }

    // Multiple zones or re-entering after exit
    return AirDefenseResult.DESTROYED
  }
}

/**
 * Create air defense checker for Air Force movement
 *
 * @param game - Current game instance
 * @param fromSquare - Starting square (0x88 index)
 * @param defenseColor - Color of defending side
 * @param offset - Movement direction offset
 * @param heroicAirforce - Whether Air Force is heroic (ignores defense)
 * @returns Function to check each square along movement path
 */
export function getCheckAirDefenseZone(
  game: CoTuLenh,
  fromSquare: number,
  defenseColor: Color,
  offset: number,
  heroicAirforce: boolean,
): () => AirDefenseResultType {
  // Heroic Air Force ignores all air defense
  if (heroicAirforce) {
    return () => AirDefenseResult.SAFE_PASS
  }

  const airDefense = game.getAirDefense()
  const checker = new AirForceMovementChecker(
    fromSquare,
    offset,
    airDefense[defenseColor],
  )

  return () => checker.check()
}
