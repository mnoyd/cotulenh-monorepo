import { CoTuLenh } from './cotulenh.js'
import {
  AirDefenseForSide,
  ANTI_AIR,
  AIR_FORCE,
  BLUE,
  isSquareOnBoard,
  MISSILE,
  NAVY,
  PieceSymbol,
  RED,
  SQUARE_MAP,
  Color,
  AirDefenseInfluence,
  Square,
  algebraic,
  AirDefense,
} from './type.js'

// --- Bitboard Constants & Helpers ---

// Map 0x88 square index to packed bit index (0-131)
// We have 11 files (0-10) and 12 ranks (0-11).
// Board index = rank * 11 + file
// Max index = 11 * 11 + 10 = 131
const SQ_TO_BIT_INDEX: number[] = new Array(256).fill(-1)
const BIT_INDEX_TO_SQ: number[] = new Array(132).fill(0)

function initBitboardMapping() {
  let idx = 0
  for (let sq = 0; sq < 256; sq++) {
    if (isSquareOnBoard(sq)) {
      SQ_TO_BIT_INDEX[sq] = idx
      BIT_INDEX_TO_SQ[idx] = sq
      idx++
    }
  }
}

initBitboardMapping()

// Lookup Table for Air Defense Masks
// Indexed by [level][squareIndex]
// Levels: 0 (not used), 1, 2, 3
const AIR_DEFENSE_MASKS: bigint[][] = [
  [], // Level 0
  [], // Level 1
  [], // Level 2
  [], // Level 3
]

// Initialize the Lookup Table
function initAirDefenseMasks() {
  // We allow up to level 3 based on current game rules (Anti-Air is max level 2 usually, but code supported dynamic levels)
  // Let's precalculate up to level 4 to be safe and future proof, matching the loop structure
  const MAX_LEVEL = 4

  // Ensure array is big enough
  for (let l = 0; l <= MAX_LEVEL; l++) {
    if (!AIR_DEFENSE_MASKS[l]) AIR_DEFENSE_MASKS[l] = []
  }

  for (let level = 1; level <= MAX_LEVEL; level++) {
    for (let sq = 0; sq < 256; sq++) {
      if (!isSquareOnBoard(sq)) continue

      const bitIndex = SQ_TO_BIT_INDEX[sq]
      let mask = 0n

      // Use the logic from the old implementation to calculate the mask bits
      for (let i = -level; i <= level; i++) {
        for (let j = -level; j <= level; j++) {
          const targetSq = sq + i + j * 16 // 0x88 arithmetic

          if (!isSquareOnBoard(targetSq)) continue

          // Circle distance check
          if (i * i + j * j <= level * level) {
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

// Helper to convert Bitboard to square array
function bitboardToSquares(bitboard: bigint): number[] {
  const squares: number[] = []
  let temp = bitboard
  let i = 0

  // Optimized: shift right and check lowest bit, stop when temp becomes 0
  // This is O(k) where k = number of set bits, instead of O(132)
  while (temp !== 0n) {
    if (temp & 1n) {
      squares.push(BIT_INDEX_TO_SQ[i])
    }
    temp >>= 1n
    i++
  }
  return squares
}

export const BASE_AIRDEFENSE_CONFIG: Partial<Record<PieceSymbol, number>> = {
  [MISSILE]: 2,
  [NAVY]: 1,
  [ANTI_AIR]: 1,
}
function getAirDefenseLevel(piece: PieceSymbol, isHero: boolean): number {
  const base = BASE_AIRDEFENSE_CONFIG[piece]
  if (!base) return 0
  if (isHero) {
    return base + 1
  }
  return base
}

export function calculateAirDefense(
  game: CoTuLenh,
  color: Color,
  airDefensePiecesPosition: AirDefensePiecesPosition,
): AirDefenseForSide {
  const airDefenseForSide: AirDefenseForSide = new Map<number, number[]>()
  for (const sqNum of airDefensePiecesPosition[color]) {
    const piece = game.get(sqNum)
    if (!piece)
      throw new Error(`Air defense piece not found at square ${sqNum}`)
    const level = getAirDefenseLevel(piece.type, piece.heroic ?? false)
    if (level > 0) {
      const influnceSq = calculateAirDefenseForSquare(sqNum, level)
      for (const sq of influnceSq) {
        if (!airDefenseForSide.has(sq)) {
          airDefenseForSide.set(sq, [])
        }
        airDefenseForSide.get(sq)!.push(sqNum)
      }
    }
  }
  return airDefenseForSide
}

export function calculateAirDefenseForSquare(
  curSq: number,
  level: number,
): number[] {
  if (level <= 0) {
    return []
  }

  // Use precalculated bitmasks if available for this level
  if (level < AIR_DEFENSE_MASKS.length) {
    const bitIndex = SQ_TO_BIT_INDEX[curSq]
    if (bitIndex === -1) return [] // Should not happen for valid square

    const mask = AIR_DEFENSE_MASKS[level][bitIndex]
    return bitboardToSquares(mask)
  }

  // Fallback for unexpectedly high levels (though unlikely)
  const allInflunceSq: number[] = []
  for (let i = -level; i <= level; i++) {
    for (let j = -level; j <= level; j++) {
      if (!isSquareOnBoard(curSq + i + j * 16)) continue
      if (i * i + j * j <= level * level) {
        allInflunceSq.push(curSq + i + j * 16)
      }
    }
  }
  return allInflunceSq
}

export type AirDefensePiecesPosition = {
  [RED]: number[]
  [BLUE]: number[]
}

export function updateAirDefensePiecesPosition(game: CoTuLenh): AirDefense {
  const airDefensePieces: AirDefensePiecesPosition = {
    [RED]: [],
    [BLUE]: [],
  }
  for (let sq = SQUARE_MAP.a12; sq <= SQUARE_MAP.k1; sq++) {
    if (!isSquareOnBoard(sq)) continue
    const piece = game.get(sq)
    if (!piece) continue
    if (BASE_AIRDEFENSE_CONFIG[piece.type]) {
      if (!airDefensePieces[piece.color]) {
        airDefensePieces[piece.color] = []
      }
      airDefensePieces[piece.color].push(sq)
    }
  }
  const airDefense: AirDefense = {
    [RED]: new Map<number, number[]>(),
    [BLUE]: new Map<number, number[]>(),
  }
  for (const color of [RED, BLUE]) {
    airDefense[color as Color] = calculateAirDefense(
      game,
      color as Color,
      airDefensePieces,
    )
  }
  return airDefense
}

export function getAirDefenseInfluence(game: CoTuLenh): AirDefenseInfluence {
  const airDefenseInfluence: AirDefenseInfluence = {
    [RED]: new Map<Square, Square[]>(),
    [BLUE]: new Map<Square, Square[]>(),
  }
  const airDefense = game.getAirDefense()
  for (const color of Object.keys(airDefense) as Color[]) {
    for (const [sqNum, influencedSquares] of airDefense[color]) {
      const square = algebraic(sqNum)
      if (!square) throw new Error('Square not found')
      airDefenseInfluence[color].set(square, influencedSquares.map(algebraic))
    }
  }
  return airDefenseInfluence
}

/**
 * Enum-like constants for air defense movement results
 */
export const AirDefenseResult = {
  SAFE_PASS: 0, // Can safely pass through this square
  KAMIKAZE: 1, // Can pass but will be destroyed (suicide move)
  DESTROYED: 2, // Cannot pass, movement stops
} as const

export function getCheckAirDefenseZone(
  game: CoTuLenh,
  fromSquare: number,
  defenseColor: Color,
  offset: number,
  heroicAirforce: boolean,
): () => (typeof AirDefenseResult)[keyof typeof AirDefenseResult] {
  if (heroicAirforce) {
    return () => AirDefenseResult.SAFE_PASS
  }
  let airDefenseResult: (typeof AirDefenseResult)[keyof typeof AirDefenseResult]
  const airDefense = game.getAirDefense()
  let to = fromSquare
  let airDefenseZoneEncountered = new Set<number>()
  let movedOutOfTheFirstADZone = false
  return () => {
    if (airDefenseResult === AirDefenseResult.DESTROYED) return airDefenseResult
    to += offset
    const influenceZoneOfSquare = airDefense[defenseColor].get(to) as number[]
    if (influenceZoneOfSquare && influenceZoneOfSquare.length > 0) {
      influenceZoneOfSquare.forEach((value) =>
        airDefenseZoneEncountered.add(value),
      )
    } else {
      if (airDefenseZoneEncountered.size > 0) {
        movedOutOfTheFirstADZone = true
      }
    }
    if (airDefenseZoneEncountered.size === 0) {
      airDefenseResult = AirDefenseResult.SAFE_PASS
    } else if (
      airDefenseZoneEncountered.size === 1 &&
      !movedOutOfTheFirstADZone
    ) {
      airDefenseResult = AirDefenseResult.KAMIKAZE
    } else {
      airDefenseResult = AirDefenseResult.DESTROYED
    }
    return airDefenseResult
  }
}
