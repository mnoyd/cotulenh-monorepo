import { bench, describe } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'

// Example FENs (add more for variety/performance realism)
const FENS = [
  undefined, // default position
  '6c4/11/11/11/11/5C5/11/11/11/11/11/5C5 r - - 0 1', // simple position
  '6c4/11/11/11/11/11/6(TI)4/11/11/11/11/5C5 r - - 0 1', // complex position
  '6c4/11/11/11/11/11/6(FTI)4/11/11/11/11/5C5 r - - 0 1', // complex position
  '6c4/11/11/11/11/11/6(FTI)4/1(NFT)9/11/11/11/5C5 r - - 0 1', // complex position
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
  }
})
