import { CoTuLenh, Move } from '../../src/cotulenh'
import {
  AIR_FORCE,
  BLUE,
  COMMANDER,
  DEFAULT_POSITION,
  INFANTRY,
  MILITIA,
  NAVY,
  Piece,
  PieceSymbol,
  RED,
  TANK,
} from '../../src/type'
import { findMove } from '../test-helpers'

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
        type: TANK,
        color: BLUE,
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

    //TODO: write fen validationß
    // it('throws on invalid FEN with too many squares in a rank', () => {
    //   const badFen = '12/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
    //   expect(() => game.load(badFen)).toThrow(/too many squares/)
    // })

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

describe('CoTuLenh Commander Rules', () => {
  describe('Commander Exposure (_isCommanderExposed)', () => {
    // ... existing code ...

    test('should detect exposed commanders on the same file (clear path)', () => {
      // c on g12, C on g7, Red to move. Path is clear.
      // Test by trying to move a blocking piece away.
      const blockingGame = new CoTuLenh(
        '6c4/11/6I4/11/11/6C4/11/11/11/11/11/11 r - - 0 1',
      ) // Corrected: k->c, K->C
      const moves = blockingGame.moves({
        square: 'g10',
        verbose: true,
      }) as Move[] // Move Infantry OFF the file
      expect(findMove(moves, 'g10', 'f10')).toBeUndefined() // Should be illegal as it exposes Red Commander
    })

    test('should detect exposed commanders on the same rank (clear path)', () => {
      // c on a6, C on k6, Red to move. Path is clear.
      const blockingGame = new CoTuLenh(
        '11/11/11/11/11/2c1I4C1/11/11/11/11/11/11 r - - 0 1',
      ) // Corrected: k->c, K->C
      const moves = blockingGame.moves({
        square: 'e7',
        verbose: true,
      }) as Move[] // Move Infantry OFF the rank
      expect(findMove(moves, 'e7', 'e8')).toBeUndefined() // Should be illegal as it exposes Red Commander
    })

    test('should NOT detect exposure if path is blocked (file)', () => {
      // c on e12, C on e6, Infantry on e9 blocks. Red to move.
      const fen = '6c4/11/11/6I4/11/6C4/11/11/11/11/11/11 r - - 0 1' // Corrected: k->c, K->C
      const game = new CoTuLenh(fen)
      // Try moving the Commander itself (which is legal if not into check/exposure)
      const commanderMove = game.moves({
        square: 'g7',
        verbose: true,
      }) as Move[] // Move commander one step off the file
      expect(findMove(commanderMove, 'g7', 'g1')).toBeDefined() // Should be legal as path is blocked
    })

    test('should NOT detect exposure if path is blocked (rank)', () => {
      // c on a6, C on k6, Infantry on e6 blocks. Red to move.
      const fen = '11/11/11/11/11/2c1I4C1/11/11/11/11/11/11 r - - 0 1' // Corrected: k->c, K->C
      const game = new CoTuLenh(fen)
      // Move the commander itself
      const commanderMove = game.moves({
        square: 'j7',
        verbose: true,
      }) as Move[] // Move commander one step off the rank
      expect(findMove(commanderMove, 'j7', 'g7')).toBeDefined() // Should be legal as path is blocked
    })

    test('should NOT allow move to exposed square', () => {
      const fen = '3c1i5/11/11/5I5/11/7C3/11/11/11/11/11/11 r - - 0 1' // Corrected: k->c, K->C
      const game = new CoTuLenh(fen)
      // Any legal commander move should be allowed
      const commanderMove = game.moves({
        square: 'h7',
        verbose: true,
      }) as Move[]
      expect(findMove(commanderMove, 'h7', 'd7')).toBeUndefined() // Should be illegal as it exposes Red Commander
      expect(findMove(commanderMove, 'h7', 'h12')).toBeDefined() // Should be legal as path is blocked by blue Infantry
    })
  })

  describe('Commander Capture (Flying General)', () => {
    test('should generate capture move when commanders are exposed (file)', () => {
      // c on e12, C on e6, Red to move. Path is clear.
      const fen = '6c4/11/11/11/11/6C4/11/11/11/11/11/11 r - - 0 1' // Corrected: k->c, K->C
      const game = new CoTuLenh(fen)
      const moves = game.moves({ square: 'g7', verbose: true }) as Move[]
      const captureMove = moves.find((m) => m.to === 'g12' && m.isCapture())
      expect(captureMove).toBeDefined()
      // Check piece type and color
      expect(captureMove?.piece.type).toBe(COMMANDER)
      expect(captureMove?.piece.color).toBe(RED)
      // Check captured piece type and color
      expect(captureMove?.captured?.type).toBe(COMMANDER)
      expect(captureMove?.captured?.color).toBe(BLUE)
      expect(captureMove?.from).toBe('g7')
      expect(captureMove?.to).toBe('g12')
    })

    test('should generate capture move when commanders are exposed (rank)', () => {
      // c on a6, C on k6, Red to move. Path is clear.
      const fen = '11/11/11/11/11/3c5C1/11/11/11/11/11/11 r - - 0 1' // Corrected: k->c, K->C
      const game = new CoTuLenh(fen)
      const moves = game.moves({ square: 'j7', verbose: true }) as Move[] // Red Commander at k6
      const captureMove = moves.find((m) => m.to === 'd7' && m.isCapture())
      expect(captureMove).toBeDefined()
      expect(captureMove?.piece.type).toBe(COMMANDER)
      expect(captureMove?.piece.color).toBe(RED)
      expect(captureMove?.captured?.type).toBe(COMMANDER)
      expect(captureMove?.captured?.color).toBe(BLUE)
      expect(captureMove?.from).toBe('j7')
      expect(captureMove?.to).toBe('d7')
    })

    test('should NOT generate capture move if path is blocked (file)', () => {
      // c on e12, C on e6, Infantry on e9 blocks. Red to move.
      const fen = '6c4/11/11/6I4/11/6C4/11/11/11/11/11/11 r - - 0 1' // Corrected: k->c, K->C
      const game = new CoTuLenh(fen)
      const moves = game.moves({ square: 'g7', verbose: true }) as Move[]
      const captureMove = moves.find((m) => m.to === 'g12' && m.isCapture())
      expect(captureMove).toBeUndefined() // Capture should not be possible
    })

    test('should NOT generate capture move if path is blocked (rank)', () => {
      // c on a6, C on k6, Infantry on e6 blocks. Red to move.
      const fen = '11/11/11/11/11/2c1I4C1/11/11/11/11/11/11 r - - 0 1' // Corrected: k->c, K->C
      const game = new CoTuLenh(fen)
      const moves = game.moves({ square: 'j7', verbose: true }) as Move[]
      const captureMove = moves.find((m) => m.to === 'c7' && m.isCapture())
      expect(captureMove).toBeUndefined() // Capture should not be possible
    })
  })
})

describe('CoTuLenh.FEN', () => {
  describe('load', () => {
    it('should load the default position correctly', () => {
      const game = new CoTuLenh()
      // No need to call load explicitly, constructor does it.
      // Check some basic state from default FEN
      expect(game.turn()).toBe(RED)
      expect(game.fen()).toBe(DEFAULT_POSITION)
      expect(game['_moveNumber']).toBe(1) // Access private for test or add getter
      expect(game['_halfMoves']).toBe(0) // Access private for test or add getter
    })

    it('should load a fen and return the same fen', () => {
      const fen = '5c5/11/4T6/11/11/8E2/11/11/11/11/11/4C6 r - - 0 1'
      const game = new CoTuLenh()
      game.load(fen)
      expect(game.fen()).toEqual(fen)
    })

    it('should load a valid FEN string', () => {
      const fen = '11/11/11/5I5/11/11/11/5i5/11/11/3c7/4C6 b - - 10 5'
      const game = new CoTuLenh()
      game.load(fen)
      expect(game.fen()).toEqual(fen)
      expect(game.turn()).toBe(BLUE)
      expect(game['_halfMoves']).toBe(10) // Access private for test or add getter
      expect(game['_moveNumber']).toBe(5) // Access private for test or add getter
      // Optionally check a piece position
      expect(game.get('e1')?.type).toBe('c')
      expect(game.get('e1')?.color).toBe(RED)
      expect(game.get('d2')?.type).toBe('c')
      expect(game.get('d2')?.color).toBe(BLUE)
    })

    it('should throw an error for an invalid FEN string by default', () => {
      const invalidFen = '11/11/11/11/11/11/11/11/11/11/4c6/4C6/11 b - - 0 1' // Extra rank
      const game = new CoTuLenh()
      expect(() => game.load(invalidFen)).toThrow(
        /Invalid FEN: expected 12 ranks/,
      )
    })

    it('should clear headers by default when loading', () => {
      const game = new CoTuLenh()
      game['_header'] = { Event: 'Test Event' }
      expect(game['_header']['Event']).toBe('Test Event')
      game.load(DEFAULT_POSITION) // Load again
      expect(game['_header']['Event']).toBeUndefined()
      // Standard FEN headers might be added back
      expect(game['_header']['SetUp']).toBe('1')
      expect(game['_header']['FEN']).toBe(DEFAULT_POSITION)
    })

    it('should preserve headers when preserveHeaders is true', () => {
      const game = new CoTuLenh()
      game['_header'] = { Event: 'Test Event Preserve' }
      expect(game['_header']['Event']).toBe('Test Event Preserve')
      const fen = '11/11/11/11/11/11/11/11/11/11/4c6/4C6 b - - 10 5'
      game.load(fen, { preserveHeaders: true })
      expect(game['_header']['Event']).toBe('Test Event Preserve')
      // Standard FEN headers should still be updated/added
      expect(game['_header']['SetUp']).toBe('1')
      expect(game['_header']['FEN']).toBe(fen)
    })

    it('should correctly parse turn, halfMoves, and moveNumber', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 b - - 25 15'
      const game = new CoTuLenh(fen)
      expect(game.turn()).toBe(BLUE)
      expect(game['_halfMoves']).toBe(25)
      expect(game['_moveNumber']).toBe(15)
    })

    it('should handle missing halfMoves and moveNumber (defaulting to 0 and 1)', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - -' // Missing last two tokens
      const game = new CoTuLenh()
      // Need skipValidation because the FEN is technically incomplete per standard
      game.load(fen, { skipValidation: true })
      expect(game.turn()).toBe(RED)
      expect(game['_halfMoves']).toBe(0)
      expect(game['_moveNumber']).toBe(1)
    })
  })

  describe('fen', () => {
    it('should return the correct FEN string', () => {
      const game = new CoTuLenh()
      expect(game.fen()).toBe(DEFAULT_POSITION)
    })
    it('should return the correct FEN string after each move', () => {
      const game = new CoTuLenh()
      game.move('Ik6')
      expect(game.fen()).toBe(
        '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/10I/2IE2M2E1/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 b - - 1 1',
      )
      game.move('Ik7')
      expect(game.fen()).toBe(
        '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2e1/10i/10I/2IE2M2E1/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 2 2',
      )
      game.move('Ixk7')
      expect(game.fen()).toBe(
        '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2e1/10I/11/2IE2M2E1/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 b - - 0 2',
      )
    })
    it('should load a fen and return the same fen', () => {
      const fen = '5c5/11/4T6/11/11/8E2/11/11/11/11/11/4C6 r - - 0 1'
      const game = new CoTuLenh()
      game.load(fen)
      expect(game.fen()).toEqual(fen)
    })
  })
})
