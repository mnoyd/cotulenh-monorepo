import { CoTuLenh } from './cotulenh'
import { DIAGONAL_OFFSETS, ORTHOGONAL_OFFSETS } from './move-generation'
import {
  AirDefenseForSide,
  ANTI_AIR,
  BLUE,
  isSquareOnBoard,
  MISSILE,
  NAVY,
  PieceSymbol,
  RED,
  SQUARE_MAP,
  AirDefenseInfluence,
  Color,
  Square,
  algebraic,
} from './type'

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
): AirDefenseForSide {
  const airDefenseForSide: AirDefenseForSide = new Map<number, Set<number>>()
  const airDefensePiecesPosition = game.getAirDefensePiecesPosition()
  for (const sqNum of airDefensePiecesPosition[color]) {
    const piece = game.get(sqNum)
    if (!piece)
      throw new Error(`Air defense piece not found at square ${sqNum}`)
    const level = getAirDefenseLevel(piece.type, piece.heroic ?? false)
    if (level > 0) {
      for (const orthogonalOffset of ORTHOGONAL_OFFSETS) {
        for (let step = 0; step <= level; step++) {
          const to = sqNum + step * orthogonalOffset
          if (!isSquareOnBoard(to)) break
          airDefenseForSide.set(
            to,
            new Set([...(airDefenseForSide.get(to) || []), sqNum]),
          )
        }
      }
      for (const diagonalOffset of DIAGONAL_OFFSETS) {
        for (let step = 0; step <= level - 1; step++) {
          const to = sqNum + step * diagonalOffset
          if (!isSquareOnBoard(to)) break
          airDefenseForSide.set(
            to,
            new Set([...(airDefenseForSide.get(to) || []), sqNum]),
          )
        }
      }
    }
  }
  return airDefenseForSide
}

export type AirDefensePiecesPosition = {
  [RED]: number[]
  [BLUE]: number[]
}

export function updateAirDefensePiecesPosition(
  game: CoTuLenh,
): AirDefensePiecesPosition {
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
  return airDefensePieces
}

export function getAirDefenseInfluence(game: CoTuLenh): AirDefenseInfluence {
  const airDefensePiecesPosition = game.getAirDefensePiecesPosition()
  const AirDefenseInfluence: AirDefenseInfluence = {
    [RED]: new Map<Square, Set<Square>>(),
    [BLUE]: new Map<Square, Set<Square>>(),
  }
  Object.entries(airDefensePiecesPosition).forEach(([color, squares]) => {
    for (const sqNum of squares) {
      const piece = game.get(sqNum)
      if (!piece)
        throw new Error(`Air defense piece not found at square ${sqNum}`)
      const level = getAirDefenseLevel(piece.type, piece.heroic ?? false)
      if (level > 0) {
        for (const orthogonalOffset of ORTHOGONAL_OFFSETS) {
          for (let step = 0; step <= level; step++) {
            const to = sqNum + step * orthogonalOffset
            if (!isSquareOnBoard(to)) break
            const toAlg = algebraic(to)
            const airDefenseSquareAlg = algebraic(sqNum)
            if (!airDefenseSquareAlg) throw new Error('Square not found')
            if (!toAlg) throw new Error('Square not found')
            AirDefenseInfluence[color as Color].set(
              airDefenseSquareAlg,
              new Set([
                ...(AirDefenseInfluence[color as Color].get(
                  airDefenseSquareAlg,
                ) || []),
                toAlg, // use algebraic(to)
              ]),
            )
          }
        }
        for (const diagonalOffset of DIAGONAL_OFFSETS) {
          for (let step = 0; step <= level - 1; step++) {
            const to = sqNum + step * diagonalOffset
            if (!isSquareOnBoard(to)) break
            const toAlg = algebraic(to)
            const airDefenseSquareAlg = algebraic(sqNum)
            if (!airDefenseSquareAlg) throw new Error('Square not found')
            if (!toAlg) throw new Error('Square not found')
            AirDefenseInfluence[color as Color].set(
              airDefenseSquareAlg,
              new Set([
                ...(AirDefenseInfluence[color as Color].get(
                  airDefenseSquareAlg,
                ) || []),
                toAlg,
              ]),
            )
          }
        }
      }
    }
  })
  return AirDefenseInfluence
}
