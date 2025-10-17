import { beforeEach, describe, expect, it } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'
import {
  INFANTRY,
  TANK,
  ARTILLERY,
  COMMANDER,
  NAVY,
  AIR_FORCE,
  MILITIA,
  RED,
  BLUE,
  PieceSymbol,
  SQUARE_MAP,
} from '../src/type'

describe('CoTuLenh.getAttackers', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
  })

  it('returns empty array if no attackers', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'e5')
    expect(game.getAttackers(SQUARE_MAP['e5'], RED)).toEqual([])
  })

  it('detects adjacent infantry attacker', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'e5')
    game.put({ type: INFANTRY, color: RED }, 'e6')
    const attackers = game.getAttackers(SQUARE_MAP['e5'], RED)
    expect(attackers).toEqual([
      expect.objectContaining({ square: SQUARE_MAP['e6'], type: INFANTRY }),
    ])
  })

  it('detects tank attacker at range', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'e5')
    game.put({ type: TANK, color: RED }, 'e7')
    const attackers = game.getAttackers(SQUARE_MAP['e5'], RED)
    expect(attackers).toEqual([
      expect.objectContaining({ square: SQUARE_MAP['e7'], type: TANK }),
    ])
  })

  it('does not detect attacker if blocked (except artillery)', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'e5')
    game.put({ type: INFANTRY, color: BLUE }, 'e6')
    game.put({ type: TANK, color: RED }, 'e7')
    const attackers = game.getAttackers(SQUARE_MAP['e5'], RED)
    expect(attackers).toEqual([])
  })

  it('detects artillery over blocking piece', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'e5')
    game.put({ type: INFANTRY, color: BLUE }, 'e6')
    game.put({ type: ARTILLERY, color: RED }, 'e8')
    const attackers = game.getAttackers(SQUARE_MAP['e5'], RED)
    expect(attackers).toEqual([
      expect.objectContaining({ square: SQUARE_MAP['e8'], type: ARTILLERY }),
    ])
  })

  it('detects carried piece as attacker', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'e5')
    // Place a stack: infantry carrying tank
    game.put(
      { type: INFANTRY, color: RED, carrying: [{ type: TANK, color: RED }] },
      'e6',
    )
    const attackers = game.getAttackers(SQUARE_MAP['e5'], RED)
    expect(attackers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ square: SQUARE_MAP['e6'], type: TANK }),
        expect.objectContaining({ square: SQUARE_MAP['e6'], type: INFANTRY }),
      ]),
    )
  })

  it('detects diagonal militia attacker', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'e5')
    game.put({ type: MILITIA, color: RED }, 'd6')
    const attackers = game.getAttackers(SQUARE_MAP['e5'], RED)
    expect(attackers).toEqual([
      expect.objectContaining({ square: SQUARE_MAP['d6'], type: MILITIA }),
    ])
  })

  it('detects air force attacking from afar', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'e5')
    game.put({ type: AIR_FORCE, color: RED }, 'h5')
    const attackers = game.getAttackers(SQUARE_MAP['e5'], RED)
    expect(attackers.some((a) => a.type === AIR_FORCE)).toBe(true)
  })

  it('returns only attackers of the specified color', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'e5')
    game.put({ type: INFANTRY, color: RED }, 'e6')
    game.put({ type: INFANTRY, color: BLUE }, 'e4')
    const attackers = game.getAttackers(SQUARE_MAP['e5'], RED)
    expect(
      attackers.every(
        (a) => a.type === INFANTRY && game.get(a.square)?.color === RED,
      ),
    ).toBe(true)
  })
  it('detects navy attacker range 4 on land piece', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
    game.put({ type: NAVY, color: RED }, 'c12')
    const attackers = game.getAttackers(SQUARE_MAP['g12'], RED)
    expect(attackers.some((a) => a.type === NAVY)).toBe(false)
  })
  it('detects navy attacker range 3 on land piece', () => {
    game.put({ type: COMMANDER, color: BLUE }, 'f12')
    game.put({ type: NAVY, color: RED }, 'c12')
    const attackers = game.getAttackers(SQUARE_MAP['f12'], RED)
    expect(attackers.some((a) => a.type === NAVY)).toBe(true)
  })
  it('detects navy attacker range 3 on water piece', () => {
    game.put({ type: NAVY, color: BLUE }, 'b10')
    game.put({ type: NAVY, color: RED }, 'b6')
    const attackers = game.getAttackers(SQUARE_MAP['b10'], RED)
    expect(attackers.some((a) => a.type === NAVY)).toBe(true)
  })
})
