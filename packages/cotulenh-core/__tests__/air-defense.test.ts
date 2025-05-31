import { describe, it, expect } from 'vitest'
import { calculateAirDefense } from '../src/move-generation'
import { CoTuLenh } from '../src/cotulenh'
import { RED, BLUE, ANTI_AIR, INFANTRY, SQUARE_MAP } from '../src/type'
import { setupGameBasic } from './test-helpers'

describe('calculateAirDefense', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = setupGameBasic()
  })
  it('returns empty maps for empty board', () => {
    const airDefense = calculateAirDefense(game)
    expect(airDefense[RED].size).toBe(0)
    expect(airDefense[BLUE].size).toBe(0)
  })

  it('calculates orthogonal/diagonal coverage for a single anti-air', () => {
    // Place anti-air at a5 (0xB4)
    game.put({ type: ANTI_AIR, color: RED }, 'c5')
    const airDefense = calculateAirDefense(game)
    // Anti-air has level 1 (not heroic), so covers 2 orthogonal, 1 diagonal steps
    expect(airDefense[RED].has(SQUARE_MAP.c5)).toBe(true)
    const covered = airDefense[RED].get(SQUARE_MAP.c5)
    // Should contain the origin and at least one orthogonal and one diagonal
    expect(covered).toContain(SQUARE_MAP.c5)
    expect(airDefense[RED].get(SQUARE_MAP.c6)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefense[RED].get(SQUARE_MAP.c4)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefense[RED].get(SQUARE_MAP.b5)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefense[RED].get(SQUARE_MAP.d5)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefense[RED].size).toBe(5)
  })

  it('increases coverage for heroic anti-air', () => {
    game.put({ type: ANTI_AIR, color: RED, heroic: true }, 'c5')
    const airDefense = calculateAirDefense(game)
    // Heroic anti-air covers more squares
    expect(airDefense[RED].size).toBe(13)
  })

  it('crossing air influence zone', () => {
    game.put({ type: ANTI_AIR, color: RED }, 'c5')
    game.put({ type: ANTI_AIR, color: RED }, 'c6')
    const airDefense = calculateAirDefense(game)
    expect(airDefense[RED].get(SQUARE_MAP.c5)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefense[RED].get(SQUARE_MAP.c5)?.has(SQUARE_MAP.c6)).toBe(true)
    expect(airDefense[RED].get(SQUARE_MAP.c6)?.size).toBe(2)
    expect(airDefense[RED].get(SQUARE_MAP.c6)?.has(SQUARE_MAP.c6)).toBe(true)
    expect(airDefense[RED].get(SQUARE_MAP.c6)?.has(SQUARE_MAP.c5)).toBe(true)
    expect(airDefense[RED].get(SQUARE_MAP.c6)?.size).toBe(2)
    expect(airDefense[RED].get(SQUARE_MAP.d5)?.size).toBe(1)
    expect(airDefense[RED].get(SQUARE_MAP.d6)?.size).toBe(1)
  })

  it('returns no coverage for non-air-defense pieces', () => {
    game.put({ type: INFANTRY, color: RED }, 'c5')
    const airDefense = calculateAirDefense(game)
    expect(airDefense[RED].size).toBe(0)
  })
})
