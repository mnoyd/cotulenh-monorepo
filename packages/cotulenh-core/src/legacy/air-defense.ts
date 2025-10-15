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
  Piece,
} from '../type.js'

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
  const allInflunceSq: number[] = []
  if (level === 0) {
    return allInflunceSq
  }
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
  gameInstance: CoTuLenh,
  fromSquare: number,
  defenseColor: Color,
  offset: number,
): () => (typeof AirDefenseResult)[keyof typeof AirDefenseResult] {
  let airDefenseResult: (typeof AirDefenseResult)[keyof typeof AirDefenseResult]
  const airDefense = gameInstance.getAirDefense()
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
