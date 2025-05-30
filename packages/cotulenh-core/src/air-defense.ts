import {
  Color,
  CoTuLenh,
  RED,
  BLUE,
  SQUARE_MAP,
  isSquareOnBoard,
  MISSILE,
  NAVY,
  ANTI_AIR,
  PieceSymbol,
} from './cotulenh'
import { DIAGONAL_OFFSETS, ORTHOGONAL_OFFSETS } from './move-generation'

type AirDefense = {
  [RED]: Map<number, Set<number>>
  [BLUE]: Map<number, Set<number>>
}

const BASE_AIRDEFENSE_CONFIG: Partial<Record<PieceSymbol, number>> = {
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

export function calculateAirDefense(game: CoTuLenh): AirDefense {
  const airDefense: AirDefense = {
    [RED]: new Map<number, Set<number>>(),
    [BLUE]: new Map<number, Set<number>>(),
  }
  for (let sq = SQUARE_MAP.a12; sq <= SQUARE_MAP.k1; sq++) {
    if (!isSquareOnBoard(sq)) continue
    const piece = game.get(sq)
    if (!piece) continue
    const level = getAirDefenseLevel(piece.type, piece.heroic ?? false)
    if (level > 0) {
      for (const orthogonalOffset of ORTHOGONAL_OFFSETS) {
        for (let step = 0; step <= level; step++) {
          const to = sq + step * orthogonalOffset
          if (!isSquareOnBoard(to)) break
          airDefense[piece.color].set(
            to,
            new Set([...(airDefense[piece.color].get(to) || []), sq]),
          )
        }
      }
      for (const diagonalOffset of DIAGONAL_OFFSETS) {
        for (let step = 0; step <= level - 1; step++) {
          const to = sq + step * diagonalOffset
          if (!isSquareOnBoard(to)) break
          airDefense[piece.color].set(
            to,
            new Set([...(airDefense[piece.color].get(to) || []), sq]),
          )
        }
      }
    }
  }
  return airDefense
}
