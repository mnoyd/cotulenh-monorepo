import { CoTuLenh } from '../src/cotulenh'
import {
  AIR_FORCE,
  BLUE,
  INFANTRY,
  MILITIA,
  NAVY,
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
      'e4',
    )
    expect(game.getHeroicStatus('e4', 't' as PieceSymbol)).toBe(true)
    expect(game.getHeroicStatus('e4', 'f' as PieceSymbol)).toBe(true)
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
})
