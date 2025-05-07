import { bench, describe } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'

// Example FENs (add more for variety/performance realism)
const FENS = [
  undefined, // default position
  '6c4/11/11/11/11/5C5/11/11/11/11/11/11 r - - 0 1', // simple position
  // Add more complex positions as needed
]

describe('CoTuLenh.moves performance', () => {
  for (const fen of FENS) {
    const fenLabel = fen || 'default'
    bench(`moves() performance [fen: ${fenLabel}]`, () => {
      const game = fen ? new CoTuLenh(fen) : new CoTuLenh()
      // Run moves() with default options
      game.moves({})
    })
    bench(`moves(verbose: true) [fen: ${fenLabel}]`, () => {
      const game = fen ? new CoTuLenh(fen) : new CoTuLenh()
      game.moves({ verbose: true })
    })
    // bench(`moves(ignoreSafety: true) [fen: ${fenLabel}]`, () => {
    //   const game = fen ? new CoTuLenh(fen) : new CoTuLenh();
    //   game.moves({ ignoreSafety: true });
    // });
  }
})
