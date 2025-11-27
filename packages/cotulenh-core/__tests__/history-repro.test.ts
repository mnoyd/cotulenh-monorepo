import { describe, expect, it } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'

describe('CoTuLenh.history reproduction', () => {
  it('should correctly return move history', () => {
    const game = new CoTuLenh()

    // Make a few simple moves using valid notation
    game.move('Ic6')
    game.move('Ch12')
    game.move('Ed6')

    const history = game.history()

    // Verify we get the moves back
    expect(history).toHaveLength(3)
    expect(history[0]).toBe('Ic6')
    expect(history[1]).toBe('Ch12')
    expect(history[2]).toBe('Ed6')
  })

  it('should preserve game state after calling history()', () => {
    const game = new CoTuLenh()

    game.move('Ic6')
    game.move('Ch12')

    const fenBefore = game.fen()
    const turnBefore = game.turn()

    // Call history (which does undo-replay)
    game.history()

    const fenAfter = game.fen()
    const turnAfter = game.turn()

    // State should be unchanged
    expect(fenAfter).toBe(fenBefore)
    expect(turnAfter).toBe(turnBefore)
  })
})
