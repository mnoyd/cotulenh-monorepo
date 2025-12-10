import { beforeEach, describe, expect, it } from 'vitest'
import {
  ARTILLERY,
  BLUE,
  CoTuLenh,
  DEFAULT_POSITION,
  INFANTRY,
  NAVY,
  Piece,
  RED,
  SQUARE_MAP,
  StandardMove,
  TANK,
} from '../src/cotulenh'
import { findMove, setupGameBasic } from './test-helpers'

describe('CoTuLenh', () => {
  describe('_moveToSan', () => {
    let game: CoTuLenh
    beforeEach(() => {
      game = new CoTuLenh(DEFAULT_POSITION) // Start with default position
    })
    it('should generate SAN for a regular move', () => {
      const moves = game.moves({
        square: 'd5',
        verbose: true,
      }) as StandardMove[] // Assuming Infantry at e5 can move to e6
      const move = findMove(moves, 'd5', 'd6')
      expect(move?.san).toBe('Ed6') // Or just 'e5-e6' if Infantry is implicit
    })

    it('should generate SAN with heroic prefix', () => {
      const fen = '5c5/11/11/11/11/11/11/11/4+T6/11/11/4C6 r - - 0 1' // Heroic Tank at e4
      const game = new CoTuLenh(fen)
      // Assuming the heroic tank can move to e5
      const moves = game.moves({
        square: 'e4',
        verbose: true,
      }) as StandardMove[]
      const move = findMove(moves, 'e4', 'e5')
      // Need to access the internal method for testing, or use the public Move object
      // This assumes the Move constructor correctly calls _moveToSan
      expect(move?.san).toBe('+Te5')
    })

    it('should generate SAN for a combination move', () => {
      // Setup FEN where a Tank at e5 can combine with Infantry at e6
      const fen = '5c5/11/11/11/11/11/4I6/4T6/11/11/11/4C6 r - - 0 1'
      const game = new CoTuLenh(fen)
      const moves = game.moves({
        square: 'e5',
        verbose: true,
      }) as StandardMove[]
      const move = findMove(moves, 'e5', 'e6')
      expect(move?.san).toBe('T&e6') // Tank at e5 combines with Infantry at e6
    })

    it('should generate SAN for a heroic combination move', () => {
      // Setup FEN where a heroic Tank at e5 combines with Infantry at e6
      const fen = '5c5/11/11/11/11/11/4I6/4+T6/11/11/11/4C6 r - - 0 1'
      const game = new CoTuLenh(fen)
      const moves = game.moves({
        square: 'e5',
        verbose: true,
      }) as StandardMove[]
      const move = findMove(moves, 'e5', 'e6')
      expect(move?.san).toBe('+T&e6') // Heroic Tank at e5 combines with Infantry at e6
    })

    it('should generate SAN with check suffix (^) - DISABLED', () => {
      const game = new CoTuLenh(
        '11/11/11/11/11/11/11/11/11/3c7/4T6/4C6 r - - 0 1',
      )
      const moves = game.moves({
        square: 'e2',
        verbose: true,
      }) as StandardMove[]
      const move = findMove(moves, 'e2', 'd2')
      // expect(move?.san).toBe('Td2^')
      expect(move?.san).toBe('Td2')
    })

    // it('should generate SAN with checkmate suffix (#) - DISABLED', () => {
    //   const game = new CoTuLenh(
    //     '11/11/11/11/11/11/11/11/11/11/3T7/4C6 r - - 0 1',
    //   )
    //   const moves = game.moves({
    //     square: 'd11',
    //     verbose: true,
    //   }) as StandardMove[]
    //   const move = findMove(moves, 'd11', 'd12')
    //   // expect(move?.san).toBe('Td12#') // Check detection disabled
    //   expect(move?.san).toBe('Td12')
    // })
  })

  // ... other describe blocks ...
})

describe('CoTuLenh Class - move() with SAN', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  it('should make a simple infantry move using SAN', () => {
    // Assuming default position has RED Infantry at f1
    game.put({ type: INFANTRY, color: RED }, 'c5')
    const result = game.move('Ic6')
    expect(result).not.toBeNull()
    expect(result?.san).toBe('Ic6')
    const pieceAtC6 = game.get('c6')
    expect(pieceAtC6?.type).toBe(INFANTRY)
    expect(pieceAtC6?.color).toBe(RED)
    expect(game.get('c5')).toBeUndefined()
    expect(game.turn()).toBe(BLUE) // Turn should switch
  })

  it('should make a simple capture using SAN', () => {
    // Setup a capture scenario
    game.put({ type: INFANTRY, color: RED }, 'c5')
    game.put({ type: INFANTRY, color: BLUE }, 'c6')
    game.load(game.fen()) // Reload to ensure state is clean for the move
    game['_turn'] = RED // Set turn explicitly if needed after put

    const result = game.move('Ixc6')
    expect(result).not.toBeNull()
    expect(result?.san).toBe('Ixc6')
    expect(result?.flags).toContain('c') // Capture flag
    const pieceAtC6 = game.get('c6')
    expect(pieceAtC6?.type).toBe(INFANTRY)
    expect(pieceAtC6?.color).toBe(RED)
    expect(game.get('c5')).toBeUndefined()
    expect(game.turn()).toBe(BLUE)
  })

  it('should handle stay capture using SAN', () => {
    // Setup: Red Artillery at d2, Blue Navy at b2
    game.put({ type: ARTILLERY, color: RED }, 'd2')
    game.put({ type: NAVY, color: BLUE }, 'b2')
    game.load(game.fen()) // Ensure state is set
    game['_turn'] = RED

    const result = game.move('A_b2')
    expect(result).not.toBeNull()
    expect(result?.san).toBe('A_b2')
    expect(result?.flags).toContain('s') // Stay capture flag
    const pieceAtD2 = game.get('d2')
    expect(pieceAtD2?.type).toBe(ARTILLERY) // Artillery stays at d2
    expect(pieceAtD2?.color).toBe(RED)
    expect(game.get('d3')).toBeUndefined() // Infantry at d3 is removed
    expect(game.turn()).toBe(BLUE)
  })

  it('should handle ambiguous stay capture using SAN', () => {
    // Setup: Red Artillery at d2, Red Artillery at d4 and blue navy at b2
    game.put({ type: ARTILLERY, color: RED }, 'd2')
    game.put({ type: ARTILLERY, color: RED }, 'd4')
    game.put({ type: NAVY, color: BLUE }, 'b2')
    game.load(game.fen()) // Ensure state is set
    game['_turn'] = RED

    const moves = game.moves() as string[]
    expect(moves).toContain('A2_b2')
    expect(moves).toContain('A4_b2')

    const result = game.move('A2_b2')
    expect(result).not.toBeNull()
    expect(result?.san).toBe('A2_b2')
    expect(result?.flags).toContain('s') // Stay capture flag
    const pieceAtD2 = game.get('d2')
    expect(pieceAtD2?.type).toBe(ARTILLERY) // Artillery stays at d2
    expect(pieceAtD2?.color).toBe(RED)
    expect(game.get('d3')).toBeUndefined() // Infantry at d3 is removed
    expect(game.turn()).toBe(BLUE)
  })

  it('should handle deploy move using SAN', () => {
    // Setup: Red Tank carrying Infantry at c2
    const carried: Piece = { type: INFANTRY, color: RED }
    game.put({ type: TANK, color: RED, carrying: [carried] }, 'c2')
    game.load(game.fen())
    game['_turn'] = RED

    //TODO: Fix bug relate to filtering moves using moves({pieceType:...}) not finding deploy move
    // Deploy Infantry to c3
    const result = game.move('I>c3')
    expect(result).not.toBeNull()
    // The SAN generated includes stay piece notation: T< (Tank stays) + I>c3 (Infantry deploys)
    expect(result?.san).toBe('T<I>c3')
    expect(result?.flags).toContain('d') // Deploy flag

    const pieceAtC2 = game.get('c2') // Tank should remain
    expect(pieceAtC2?.type).toBe(TANK)
    expect(pieceAtC2?.carrying).toBeUndefined() // No longer carrying

    const pieceAtC3 = game.get('c3') // Infantry deployed
    expect(pieceAtC3?.type).toBe(INFANTRY)
    expect(pieceAtC3?.color).toBe(RED)

    // Turn doesn't switch on deploy
    expect(game.turn()).toBe(RED)
    expect(game.getSession()?.stackSquare).toBe(SQUARE_MAP['c2']) // c2 in 0x88
  })

  it('should return null for an invalid SAN move', () => {
    expect(() => game.move('InvalidMove')).toThrow()
    expect(game.turn()).toBe(RED) // Turn should not switch
  })

  it('should return null for an illegal move in SAN', () => {
    expect(() => game.move('If1-f0')).toThrow() // Assuming f0 is off-board or illegal
  })

  // --- Add more test cases for: ---
  // - Deploy captures (e.g., "(T|I)c2>xd3")
  // - Deploy stay captures (e.g., "(T|I)c2<d3")
  // - Combination moves (e.g., "(T|I)c2+d3")
  // - Moves involving heroic pieces (e.g., "+Tc2-c3", "(+T|I)c2>c3")
  // - Moves resulting in game end conditions (if implemented)
  // - Ambiguous moves (if ambiguity resolution is implemented)
  // - Moves for all piece types (Navy, Commander, etc.)
  // - Edge cases and different board states
})
