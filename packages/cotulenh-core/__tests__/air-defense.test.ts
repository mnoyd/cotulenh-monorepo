import { describe, it, expect } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'
import { RED, BLUE, ANTI_AIR, INFANTRY, SQUARE_MAP } from '../src/type'
import { setupGameBasic } from './test-helpers'
import {
  calculateAirDefense,
  updateAirDefensePiecesPosition,
} from '../src/air-defense'

describe('calculateAirDefense', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = setupGameBasic()
  })
  it('returns empty maps for empty board', () => {
    const airDefense = updateAirDefensePiecesPosition(game)
    expect(airDefense[RED].length).toBe(0)
    expect(airDefense[BLUE].length).toBe(0)
  })

  it('calculates orthogonal/diagonal coverage for a single anti-air', () => {
    // Place anti-air at a5 (0xB4)
    game.put({ type: ANTI_AIR, color: RED }, 'c5')
    const airDefenseRed = calculateAirDefense(game, RED)
    // Anti-air has level 1 (not heroic), so covers 2 orthogonal, 1 diagonal steps
    expect(airDefenseRed.has(SQUARE_MAP.c5)).toBe(true)
    const covered = airDefenseRed.get(SQUARE_MAP.c5)
    // Should contain the origin and at least one orthogonal and one diagonal
    expect(covered).toContain(SQUARE_MAP.c5)
    expect(airDefenseRed.get(SQUARE_MAP.c6)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefenseRed.get(SQUARE_MAP.c4)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefenseRed.get(SQUARE_MAP.b5)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefenseRed.get(SQUARE_MAP.d5)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefenseRed.size).toBe(5)
  })

  it('increases coverage for heroic anti-air', () => {
    game.put({ type: ANTI_AIR, color: RED, heroic: true }, 'c5')
    const airDefenseRed = calculateAirDefense(game, RED)
    // Heroic anti-air covers more squares
    expect(airDefenseRed.size).toBe(13)
  })

  it('crossing air influence zone', () => {
    game.put({ type: ANTI_AIR, color: RED }, 'c5')
    game.put({ type: ANTI_AIR, color: RED }, 'c6')
    const airDefenseRed = calculateAirDefense(game, RED)
    expect(airDefenseRed.get(SQUARE_MAP.c5)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefenseRed.get(SQUARE_MAP.c5)?.has(SQUARE_MAP.c6)).toBe(true)
    expect(airDefenseRed.get(SQUARE_MAP.c6)?.size).toBe(2)
    expect(airDefenseRed.get(SQUARE_MAP.c6)?.has(SQUARE_MAP.c6)).toBe(true)
    expect(airDefenseRed.get(SQUARE_MAP.c6)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefenseRed.get(SQUARE_MAP.d5)?.size).toBe(1)
    expect(airDefenseRed.get(SQUARE_MAP.d6)?.size).toBe(1)
  })

  it('returns no coverage for non-air-defense pieces', () => {
    game.put({ type: INFANTRY, color: RED }, 'c5')
    const airDefenseRed = calculateAirDefense(game, RED)
    expect(airDefenseRed.size).toBe(0)
  })
})
