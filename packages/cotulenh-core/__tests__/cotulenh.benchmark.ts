import { bench, describe } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'

// Example FENs (add more for variety/performance realism)
const FENS = [
  undefined, // default position
  '6c4/11/11/11/11/5C5/11/11/11/11/11/5C5 r - - 0 1', // simple position
  '6c4/11/11/11/11/11/6(TI)4/11/11/11/11/5C5 r - - 0 1', // complex position
  '6c4/11/11/11/11/11/6(FTI)4/11/11/11/11/5C5 r - - 0 1', // complex position
  '6c4/11/11/11/11/11/6(FTI)4/1(NFT)9/11/11/11/5C5 r - - 0 1', // complex position
  '3c7/1(nf)3h1h3/6s4/4gt1(tm)g2/2(ni)(ea)4(ea)1(fi)/11/7(FTC)2I/1NIE2M1GE1/2(NFT)1G6/3A2S2A1/5H1H3/11 r - - 22 12', //lots of stack on the board
  // Add more complex positions as needed
]

describe('CoTuLenh.moves performance', () => {
  for (const fen of FENS) {
    const fenLabel = fen || 'default'
    bench(`moves() performance [fen: ${fenLabel.slice(0, 30)}]`, () => {
      const game = fen ? new CoTuLenh(fen) : new CoTuLenh()
      // Run moves() with default options
      game.moves({})
    })
    bench(`moves(verbose: true) [fen: ${fenLabel.slice(0, 30)}]`, () => {
      const game = fen ? new CoTuLenh(fen) : new CoTuLenh()
      game.moves({ verbose: true })
    })
  }
})
