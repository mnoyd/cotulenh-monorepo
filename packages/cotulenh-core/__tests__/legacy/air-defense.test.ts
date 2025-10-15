import { describe, it, expect } from 'vitest'
import { CoTuLenh } from '../../src/cotulenh'
import { RED, BLUE, ANTI_AIR, INFANTRY, SQUARE_MAP } from '../../src/type'
import { setupGameBasic } from '../test-helpers'
import {
  calculateAirDefenseForSquare,
  updateAirDefensePiecesPosition,
} from '../../src/air-defense'

describe('calculateAirDefense', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = setupGameBasic()
  })
  it('returns empty maps for empty board', () => {
    const airDefense = updateAirDefensePiecesPosition(game)
    expect(airDefense[RED].size).toBe(0)
    expect(airDefense[BLUE].size).toBe(0)
  })

  it('calculates orthogonal/diagonal coverage for a single anti-air', () => {
    // Place anti-air at a5 (0xB4)
    game.put({ type: ANTI_AIR, color: RED }, 'c5')
    const airDefenseRed = updateAirDefensePiecesPosition(game)
    // Anti-air has level 1 (not heroic), so covers 2 orthogonal, 1 diagonal steps
    expect(airDefenseRed[RED].has(SQUARE_MAP.c5)).toBe(true)
    const covered = airDefenseRed[RED].get(SQUARE_MAP.c5)
    // Should contain the origin and at least one orthogonal and one diagonal
    expect(covered).toContain(SQUARE_MAP.c5)
    expect(airDefenseRed[RED].get(SQUARE_MAP.c6)?.includes(SQUARE_MAP.c5)).toBe(
      true,
    )
    expect(airDefenseRed[RED].get(SQUARE_MAP.c4)?.includes(SQUARE_MAP.c5)).toBe(
      true,
    )
    expect(airDefenseRed[RED].get(SQUARE_MAP.b5)?.includes(SQUARE_MAP.c5)).toBe(
      true,
    )
    expect(airDefenseRed[RED].get(SQUARE_MAP.d5)?.includes(SQUARE_MAP.c5)).toBe(
      true,
    )
    expect(airDefenseRed[RED].size).toBe(5)
  })

  it('increases coverage for heroic anti-air', () => {
    game.put({ type: ANTI_AIR, color: RED, heroic: true }, 'c5')
    const airDefenseRed = updateAirDefensePiecesPosition(game)
    // Heroic anti-air covers more squares
    expect(airDefenseRed[RED].size).toBe(13)
  })

  it('crossing air influence zone', () => {
    game.put({ type: ANTI_AIR, color: RED }, 'c5')
    game.put({ type: ANTI_AIR, color: RED }, 'c6')
    const airDefenseRed = updateAirDefensePiecesPosition(game)
    expect(airDefenseRed[RED].get(SQUARE_MAP.c5)?.includes(SQUARE_MAP.c5)).toBe(
      true,
    )
    expect(airDefenseRed[RED].get(SQUARE_MAP.c5)?.includes(SQUARE_MAP.c6)).toBe(
      true,
    )
    expect(airDefenseRed[RED].get(SQUARE_MAP.c6)?.includes(SQUARE_MAP.c6)).toBe(
      true,
    )
    expect(airDefenseRed[RED].get(SQUARE_MAP.c6)?.includes(SQUARE_MAP.c5)).toBe(
      true,
    )
    expect(airDefenseRed[RED].get(SQUARE_MAP.d5)?.includes(SQUARE_MAP.c5)).toBe(
      true,
    )
    expect(airDefenseRed[RED].get(SQUARE_MAP.d6)?.includes(SQUARE_MAP.c6)).toBe(
      true,
    )
  })

  it('returns no coverage for non-air-defense pieces', () => {
    game.put({ type: INFANTRY, color: RED }, 'c5')
    const airDefenseRed = updateAirDefensePiecesPosition(game)
    expect(airDefenseRed[RED].size).toBe(0)
  })
})

describe('calculateAirDefenseForPiece', () => {
  it('level 0', () => {
    const airInflunceSquare = calculateAirDefenseForSquare(SQUARE_MAP.g6, 0)
    expect(airInflunceSquare.length).toBe(0)
  })
  it('level 1', () => {
    const airInflunceSquare = calculateAirDefenseForSquare(SQUARE_MAP.g6, 1)
    expect(airInflunceSquare.length).toBe(5)
    expect(airInflunceSquare).toContain(SQUARE_MAP.g6)
    expect(airInflunceSquare).toContain(SQUARE_MAP.g5)
    expect(airInflunceSquare).toContain(SQUARE_MAP.g7)
    expect(airInflunceSquare).toContain(SQUARE_MAP.f6)
    expect(airInflunceSquare).toContain(SQUARE_MAP.h6)
  })
  it('level 2', () => {
    const airInflunceSquare = calculateAirDefenseForSquare(SQUARE_MAP.g6, 2)
    expect(airInflunceSquare.length).toBe(13)
  })
  it('level 3', () => {
    const airInflunceSquare = calculateAirDefenseForSquare(SQUARE_MAP.g6, 3)
    expect(airInflunceSquare.length).toBe(29)
  })
  it('side of board', () => {
    const airInflunceSquare = calculateAirDefenseForSquare(SQUARE_MAP.g1, 1)
    expect(airInflunceSquare.length).toBe(4)
    expect(airInflunceSquare).toContain(SQUARE_MAP.g1)
    expect(airInflunceSquare).toContain(SQUARE_MAP.g2)
    expect(airInflunceSquare).toContain(SQUARE_MAP.f1)
    expect(airInflunceSquare).toContain(SQUARE_MAP.h1)
  })
  it('corner of board bottom left', () => {
    const airInflunceSquare = calculateAirDefenseForSquare(SQUARE_MAP.k1, 2)
    expect(airInflunceSquare.length).toBe(6)
    expect(airInflunceSquare).toContain(SQUARE_MAP.k1)
    expect(airInflunceSquare).toContain(SQUARE_MAP.i1)
    expect(airInflunceSquare).toContain(SQUARE_MAP.j1)
    expect(airInflunceSquare).toContain(SQUARE_MAP.k2)
    expect(airInflunceSquare).toContain(SQUARE_MAP.k3)
    expect(airInflunceSquare).toContain(SQUARE_MAP.j2)
  })

  it('corner of board top left', () => {
    const airInflunceSquare = calculateAirDefenseForSquare(SQUARE_MAP.k12, 2)
    expect(airInflunceSquare.length).toBe(6)
    expect(airInflunceSquare).toContain(SQUARE_MAP.k12)
    expect(airInflunceSquare).toContain(SQUARE_MAP.i12)
    expect(airInflunceSquare).toContain(SQUARE_MAP.j12)
    expect(airInflunceSquare).toContain(SQUARE_MAP.k11)
    expect(airInflunceSquare).toContain(SQUARE_MAP.k10)
    expect(airInflunceSquare).toContain(SQUARE_MAP.j11)
  })
})
