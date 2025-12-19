import { describe, it, expect, beforeEach } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'
import { COMMANDER, RED, BLUE, TANK } from '../src/type'

describe('Commander Flying General Sight Block', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
  })

  it('should block move that enters exposed file (Horizontal Move)', () => {
    // Red Commander at d1 (File D). Blue Commander at e12 (File E).
    // Red moves d1 -> e1.
    // e1 is in File E, exposed to e12.

    game.put({ type: COMMANDER, color: RED }, 'd1')
    game.put({ type: COMMANDER, color: BLUE }, 'e12')

    const moves = game.moves({ verbose: true, square: 'd1' })
    const destinations = moves.map((m: any) => m.to)

    expect(destinations).toContain('d2') // Safe vertical
    expect(destinations).not.toContain('e1') // Exposed horizontal
  })

  it('should block move that STAYS in exposed file (Vertical Move)', () => {
    // Red Commander at e1 (Exposed). Blue Commander at e12.
    // Red moves e1 -> e2.
    // e2 is still exposed. Should be blocked.
    // e1 -> d1 (Safe). Should be allowed.

    game.put({ type: COMMANDER, color: RED }, 'e1')
    game.put({ type: COMMANDER, color: BLUE }, 'e12')

    const moves = game.moves({ verbose: true, square: 'e1' })
    const destinations = moves.map((m: any) => m.to)

    expect(destinations).toContain('d1') // Safe side step
    expect(destinations).not.toContain('e2') // Still exposed
  })

  it('should allow crossing if vision is blocked', () => {
    // Red Commander d1. Blue Commander e12.
    // Blocker at e7.
    // Red moves d1 -> e1.
    // e1 is safe due to blocker.

    game.put({ type: COMMANDER, color: RED }, 'd1')
    game.put({ type: COMMANDER, color: BLUE }, 'e12')
    game.put({ type: 'i', color: BLUE }, 'e7') // Blocker

    const moves = game.moves({ verbose: true, square: 'd1' })
    const destinations = moves.map((m: any) => m.to)

    expect(destinations).toContain('e1') // Safe
  })

  it('should allow crossing if commander is being COMPONENT (Carried)', () => {
    // Red Commander is CARRIED by a Tank at d1. Blue Commander at e12.
    // Red Tank moves d1 -> e1.
    // e1 is normally exposed to e12.
    // But since Commander is hidden inside Tank, it's not exposed.

    // Place a Tank carrying a Commander
    game.put(
      {
        type: TANK,
        color: RED,
        carrying: [{ type: COMMANDER, color: RED, heroic: false }],
      },
      'd1',
    )

    game.put({ type: COMMANDER, color: BLUE }, 'e12')

    const moves = game.moves({ verbose: true, square: 'd1' })
    const destinations = moves.map((m: any) => m.to)

    expect(destinations).toContain('e1') // Should be allowed because Commander is hidden
  })
})
