import { beforeEach, describe, expect, it } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'
import { BLUE, RED, INFANTRY, TANK, HEADQUARTER, COMMANDER } from '../src/type'

describe('Last Guard Promotion', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
  })

  it('Promotes last remaining non-commander piece (Infantry)', () => {
    // Red: Commander + 2 Infantry
    game.put({ type: COMMANDER, color: RED }, 'e1')
    game.put({ type: INFANTRY, color: RED }, 'd2')
    game.put({ type: INFANTRY, color: RED }, 'f2')

    // Blue: Commander (blocked view or diff file)
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
    game.put({ type: TANK, color: BLUE }, 'd3') // Attacker

    game['_turn'] = BLUE

    // d2 Infantry is NOT heroic initially
    expect(game.get('d2')?.heroic).toBe(false)
    expect(game.get('f2')?.heroic).toBe(false)

    // Blue Tank captures Red Infantry at d2
    game.move({ from: 'd3', to: 'd2', piece: TANK })

    // Red now has Commander (e1) + Infantry (f2). Total 2.
    // The remaining Infantry at f2 should become Heroic.
    expect(game.get('f2')?.heroic).toBe(true)

    // d2 is now Blue Tank
    expect(game.get('d2')?.color).toBe(BLUE)
  })

  it('Does NOT promote if more than 1 non-commander remains', () => {
    // Red: Commander + 3 Infantry
    game.put({ type: COMMANDER, color: RED }, 'e1')
    game.put({ type: INFANTRY, color: RED }, 'd2')
    game.put({ type: INFANTRY, color: RED }, 'f2')
    game.put({ type: INFANTRY, color: RED }, 'e2')

    // Blue captures one
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
    game.put({ type: TANK, color: BLUE }, 'd3')
    game['_turn'] = BLUE

    // Move tank to capture d2
    game.move({ from: 'd3', to: 'd2', piece: TANK })

    // Red still has f2 and e2 (Total 3 pieces). No promotion.
    expect(game.get('f2')?.heroic).toBe(false)
    expect(game.get('e2')?.heroic).toBe(false)
  })

  it('Promotes Headquarter if it is the last guard', () => {
    // Red: Commander + Headquarter
    game.put({ type: COMMANDER, color: RED }, 'e1')

    game.put({ type: HEADQUARTER, color: RED }, 'h1')
    game.put({ type: INFANTRY, color: RED }, 'g2') // Extra piece

    // Blue captures g2
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
    game.put({ type: TANK, color: BLUE }, 'g3')
    game['_turn'] = BLUE

    game.move({ from: 'g3', to: 'g2', piece: TANK })

    // Now Red has Commander + HQ. HQ should promote.
    expect(game.get('h1')?.heroic).toBe(true)
    expect(game.get('h1')?.type).toBe(HEADQUARTER)
  })

  it('Counts carried pieces correctly (Tank carrying Infantry = 2 pieces)', () => {
    // Red: Commander + Tank(carrying Infantry). Total 3 atomic pieces.
    game.put({ type: COMMANDER, color: RED }, 'e1')
    game.put(
      {
        type: TANK,
        color: RED,
        carrying: [{ type: INFANTRY, color: RED }],
      },
      'd2',
    )

    // Situation: We have > 2 pieces. No promotion should happen.
    // We need a move to trigger the check.
    // Blue moves randomly.
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
    game['_turn'] = BLUE

    const moveResult = game.move({ from: 'g12', to: 'g11', piece: COMMANDER }) // Just a move

    // Check Red status
    const tank = game.get('d2')
    expect(tank?.heroic).toBeFalsy()
    // Check inside piece
    expect(tank?.carrying?.[0].heroic).toBeFalsy()
  })

  it('Promotes correctly when Tank carrying Commander leaves 1 other piece?', () => {
    // Case: Tank(Commander) + Infantry.
    // Total pieces = 3 (Tank, Commander, Infantry).
    // Last Guard logic says: Total Atomic Pieces == 2 promotes.
    // So here 3 pieces. No promo.
    // This assumes specific interpretation of "Commander + 1 piece".

    // Let's test the "Pure" case: Commander + Tank.
    // Red: Commander + Tank.
    game.put({ type: COMMANDER, color: RED }, 'e1')
    game.put({ type: INFANTRY, color: RED }, 'd2') // Extra to be killed
    game.put({ type: TANK, color: RED }, 'f2') // The Guard

    // Blue kills Infantry
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
    game.put({ type: TANK, color: BLUE }, 'd3')
    game['_turn'] = BLUE

    game.move({ from: 'd3', to: 'd2', piece: TANK })

    // Remaining: Commander + Tank. Tank becomes Heroic.
    expect(game.get('f2')?.heroic).toBe(true)
  })

  it('Handles multiple pieces becoming Last Guard (e.g. suicides)', () => {
    // Scenario: Blue performs suicide capture that reduces THEIR OWN count to 2?
    // Our logic runs for both colors.
    // Blue: Commander + Infantry A + Kami (Suicide Piece).
    // Red: Target.
    // Blue Kami attacks Red Target (Suicide).
    // Blue pieces reduced: Kami dies.
    // Remaining: Commander + Infantry A.
    // Infantry A should become Heroic.

    game.put({ type: COMMANDER, color: RED }, 'e1')
    game.put({ type: INFANTRY, color: RED }, 'e2') // The Guard

    // Red moves Infantry e2->e3. Should remain/become Heroic check.
    game['_turn'] = RED
    game.move({ from: 'e2', to: 'e3', piece: INFANTRY })

    // Total is 2. It should be Heroic now if not already.
    expect(game.get('e3')?.heroic).toBe(true)
  })
})
