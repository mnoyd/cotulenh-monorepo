import { CoTuLenh } from '../../src/cotulenh'
import { RED, DEFAULT_POSITION, BLUE } from '../../src/type'

describe('CoTuLenh Move Generation', () => {
  it('should generate legal moves for the current player (Red) from the default position', () => {
    const game = new CoTuLenh(DEFAULT_POSITION)

    // Verify initial turn
    expect(game.turn()).toBe(RED)

    // Generate moves (simple format)
    const moves = game.moves()

    // Basic assertion: Ensure moves are generated
    expect(moves).toBeInstanceOf(Array)
    expect(moves.length).toBeGreaterThan(0)

    const redInfantryMovesFromC5 = game.moves({ square: 'c5' })
    expect(redInfantryMovesFromC5).toContain('Ic6')
    const blueInfantryMovesFromC8fail = game.moves({ square: 'c8' })
    expect(blueInfantryMovesFromC8fail).toHaveLength(0)

    game.move({ from: 'c5', to: 'c6' })

    // Verify turn has changed
    expect(game.turn()).toBe(BLUE)
    const blueInfantryMovesFromC8 = game.moves({ square: 'c8' })
    expect(blueInfantryMovesFromC8).toContain('Ic7')
  })

  // Add more tests for specific scenarios or Blue's turn if desired
  // e.g., load a FEN where it's Blue's turn and check moves
})
