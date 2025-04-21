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
  RED,
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

  describe('CoTuLenh.load', () => {
    let game: CoTuLenh
    beforeEach(() => {
      game = new CoTuLenh()
      game.clear()
    })

    it('loads a simple FEN and sets up pieces correctly', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/3C7 r - - 0 1'
      game.load(fen)
      expect(game.turn()).toBe(RED)
      expect(game.get('k1')).toBeUndefined()
      expect(game.get('b1')).toBeUndefined()
      expect(game.get('d1')).toMatchObject({
        type: COMMANDER,
        color: RED,
        heroic: false,
      })
    })

    it('loads a FEN with heroic piece', () => {
      const fen = '11/11/11/11/11/11/11/4t6/5+I5/11/11/9C1 r - - 0 1'
      game.load(fen)
      expect(game.get('f4')).toMatchObject({
        type: INFANTRY,
        color: RED,
        heroic: true,
      })
      expect(game.get('e5')).toMatchObject({
        type: INFANTRY,
        color: RED,
        heroic: false,
      })
    })

    it('loads a FEN with a stack (carrier with carried pieces)', () => {
      // Navy (blue) carrying tank (blue) and infantry (blue) at d5
      const fen = '11/11/11/11/1(nft)9/11/11/11/11/11/11/11 b - - 0 1'
      game.load(fen)
      const sq = game.get('b8')
      expect(game.turn()).toBe(BLUE)
      expect(sq).toMatchObject({ type: NAVY, color: BLUE, heroic: false })
      expect(sq?.carrying).toHaveLength(2)
      expect(sq?.carrying?.[0]).toMatchObject({ type: AIR_FORCE, color: BLUE })
      expect(sq?.carrying?.[1]).toMatchObject({ type: TANK, color: BLUE })
    })

    //TODO: examine load combined piece in load fen
    it('loads a FEN with a heroic carrier in a stack', () => {
      // Heroic navy (blue) carrying tank (blue) at b8
      const fen = '11/11/11/11/1(+n+t)9/11/11/11/11/11/11/11 r - - 0 1'
      game.load(fen)
      const sq = game.get('b8')
      expect(sq).toMatchObject({ type: NAVY, color: BLUE, heroic: true })
      expect(sq?.carrying?.[0]).toMatchObject({
        type: TANK,
        color: BLUE,
        heroic: true,
      })
    })

    it('throws on invalid FEN with wrong rank count', () => {
      const badFen = '11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      expect(() => game.load(badFen)).toThrow(/expected 12 ranks/)
    })

    it('throws on invalid FEN with too many squares in a rank', () => {
      const badFen = '12/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      expect(() => game.load(badFen)).toThrow(/too many squares/)
    })

    it('parses turn, halfmove, and move number from FEN', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/9C1 b - - 4 12'
      game.load(fen)
      // @ts-ignore: access private
      expect(game._turn).toBe(BLUE)
      // @ts-ignore: access private
      expect(game._halfMoves).toBe(4)
      // @ts-ignore: access private
      expect(game._moveNumber).toBe(12)
    })
    //TODO: add fen write for middle deploy state move
  })
})
