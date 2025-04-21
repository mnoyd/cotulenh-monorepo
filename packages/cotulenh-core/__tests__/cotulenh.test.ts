import { CoTuLenh } from '../src/cotulenh'
import {
  AIR_FORCE,
  BLUE,
  COMMANDER,
  INFANTRY,
  MILITIA,
  NAVY,
  Piece,
  PieceSymbol,
  TANK,
} from '../src/type'

describe('CoTuLenh.getHeroicStatus', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
  })

  it('returns false if square is empty', () => {
    expect(game.getHeroicStatus('e4')).toBe(false)
  })

  it('returns the heroic status of the piece at the square', () => {
    game.put({ type: INFANTRY, color: BLUE, heroic: true }, 'e4')
    expect(game.getHeroicStatus('e4')).toBe(true)
    game.put({ type: INFANTRY, color: BLUE, heroic: false }, 'e4')
    expect(game.getHeroicStatus('e4')).toBe(false)
  })

  it('returns the heroic status of a carrying piece if pieceType is specified', () => {
    game.put(
      {
        type: INFANTRY,
        color: BLUE,
        heroic: false,
        carrying: [
          { type: TANK, color: BLUE, heroic: true },
          { type: MILITIA, color: BLUE, heroic: false },
        ],
      },
      'e4',
    )
    expect(game.getHeroicStatus('e4', 't' as PieceSymbol)).toBe(true)
    expect(game.getHeroicStatus('e4', 'i' as PieceSymbol)).toBe(false)
    expect(game.getHeroicStatus('e4')).toBe(false)
  })

  it('returns false if carrying piece of specified type does not exist', () => {
    game.put(
      {
        type: INFANTRY,
        color: BLUE,
        heroic: false,
        carrying: [{ type: TANK, color: BLUE, heroic: true }],
      },
      'e4',
    )
    expect(game.getHeroicStatus('e4', 'm' as PieceSymbol)).toBe(false)
  })

  it('returns the heroic status of a carrying piece if pieceType is specified', () => {
    game.put(
      {
        type: NAVY,
        color: BLUE,
        heroic: false,
        carrying: [
          { type: TANK, color: BLUE, heroic: true },
          { type: AIR_FORCE, color: BLUE, heroic: true },
        ],
      },
      'b7',
    )
    expect(game.getHeroicStatus('b7', 't' as PieceSymbol)).toBe(true)
    expect(game.getHeroicStatus('b7', 'f' as PieceSymbol)).toBe(true)
  })

  it('returns false if carrying piece of specified type does not exist', () => {
    game.put(
      {
        type: NAVY,
        color: BLUE,
        heroic: false,
        carrying: [{ type: TANK, color: BLUE, heroic: true }],
      },
      'e4',
    )
    expect(game.getHeroicStatus('e4', 'm' as PieceSymbol)).toBe(false)
  })

  describe('CoTuLenh.put', () => {
    let game: CoTuLenh
    beforeEach(() => {
      game = new CoTuLenh()
      game.clear()
    })

    it('places a normal piece on a valid square', () => {
      const result = game.put({ type: INFANTRY, color: BLUE }, 'd5')
      expect(result).toBe(true)
      expect(game.get('d5')).toMatchObject({
        type: INFANTRY,
        color: BLUE,
        heroic: false,
      })
    })

    it('places a heroic piece', () => {
      const result = game.put({ type: TANK, color: BLUE, heroic: true }, 'e6')
      expect(result).toBe(true)
      expect(game.get('e6')).toMatchObject({
        type: TANK,
        color: BLUE,
        heroic: true,
      })
    })

    it('places a piece with carrying property', () => {
      const carrying: Piece[] = [
        { type: INFANTRY, color: BLUE, heroic: false },
        { type: TANK, color: BLUE, heroic: true },
      ]
      const result = game.put({ type: NAVY, color: BLUE, carrying }, 'b7')
      expect(result).toBe(true)
      const navy = game.get('b7')
      expect(navy).toBeDefined()
      expect(navy?.carrying).toHaveLength(2)
      expect(navy?.heroic).toBe(false)
      expect(navy?.carrying?.[0]).toMatchObject({
        type: INFANTRY,
        color: BLUE,
        heroic: false,
      })
      expect(navy?.carrying?.[1]).toMatchObject({
        type: TANK,
        color: BLUE,
        heroic: true,
      })
    })

    it('enforces commander limit (cannot place second commander of same color)', () => {
      // Place first commander
      expect(game.put({ type: COMMANDER, color: BLUE }, 'f5')).toBe(true)
      // Try to place second commander at a different square
      expect(game.put({ type: COMMANDER, color: BLUE }, 'f12')).toBe(false)
      // Can replace the commander at the same square
      expect(game.put({ type: COMMANDER, color: BLUE }, 'f5')).toBe(true)
    })

    it('allows commander of both colors', () => {
      expect(game.put({ type: COMMANDER, color: BLUE }, 'f5')).toBe(true)
      expect(game.put({ type: COMMANDER, color: 'r' }, 'k12')).toBe(true)
      expect(game.get('f5')?.type).toBe(COMMANDER)
      expect(game.get('k12')?.type).toBe(COMMANDER)
    })

    it('returns false when placing on an invalid square', () => {
      // 'z9' is not a valid square
      expect(game.put({ type: INFANTRY, color: BLUE }, 'z9' as any)).toBe(false)
    })

    it('returns false when placing on an invalid terrain', () => {
      expect(game.put({ type: NAVY, color: BLUE }, 'e4')).toBe(false)
    })

    it('removes previous commander from board when placing new one at same square', () => {
      expect(game.put({ type: COMMANDER, color: BLUE }, 'f5')).toBe(true)
      // Place a normal piece over the commander
      expect(game.put({ type: INFANTRY, color: BLUE }, 'f5')).toBe(true)
      // Now commander should be removed
      expect(game.get('f5')?.type).toBe(INFANTRY)
    })
  })
})
