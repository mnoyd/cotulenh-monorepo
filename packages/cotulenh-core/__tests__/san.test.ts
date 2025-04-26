import { CoTuLenh, DEFAULT_POSITION, Move } from '../src/cotulenh'
import { findMove } from './test-helpers'

describe('CoTuLenh', () => {
  describe('_moveToSan', () => {
    let game: CoTuLenh
    beforeEach(() => {
      game = new CoTuLenh(DEFAULT_POSITION) // Start with default position
    })
    it('should generate SAN for a regular move', () => {
      const moves = game.moves({ square: 'd5', verbose: true }) as Move[] // Assuming Infantry at e5 can move to e6
      const move = findMove(moves, 'd5', 'd6')
      expect(move?.san).toBe('Ed6') // Or just 'e5-e6' if Infantry is implicit
    })

    it('should generate SAN with heroic prefix', () => {
      const fen = '5c5/11/11/11/11/11/11/11/4+T6/11/11/4C6 r - - 0 1' // Heroic Tank at e4
      const game = new CoTuLenh(fen)
      // Assuming the heroic tank can move to e5
      const moves = game.moves({ square: 'e4', verbose: true }) as Move[]
      const move = findMove(moves, 'e4', 'e5')
      // Need to access the internal method for testing, or use the public Move object
      // This assumes the Move constructor correctly calls _moveToSan
      expect(move?.san).toBe('+Te5')
    })

    it('should generate SAN for a combination move', () => {
      // Setup FEN where a Tank at e5 can combine with Infantry at e6
      const fen = '5c5/11/11/11/11/11/4I6/4T6/11/11/11/4C6 r - - 0 1'
      const game = new CoTuLenh(fen)
      const moves = game.moves({ square: 'e5', verbose: true }) as Move[]
      const move = findMove(moves, 'e5', 'e6')
      expect(move?.san).toBe('T&e6(T|I)') // Tank at e5 combines with Infantry at e6
    })

    it('should generate SAN for a heroic combination move', () => {
      // Setup FEN where a heroic Tank at e5 combines with Infantry at e6
      const fen = '5c5/11/11/11/11/11/4I6/4+T6/11/11/11/4C6 r - - 0 1'
      const game = new CoTuLenh(fen)
      const moves = game.moves({ square: 'e5', verbose: true }) as Move[]
      const move = findMove(moves, 'e5', 'e6')
      expect(move?.san).toBe('+T&e6(+T|I)') // Heroic Tank at e5 combines with Infantry at e6
    })

    //TODO: handle check suffix (^)
    it('should generate SAN with check suffix (^)', () => {
      // Setup FEN where moving Tank from e5 to f5 checks the blue commander at f12
      const fen = '5ca4/5m5/3T7/11/11/8E2/11/11/11/11/11/4C6 r - - 0 1'
      const game = new CoTuLenh(fen)
      expect(game.fen()).toEqual(fen)
      const moves = game.moves({ square: 'd10', verbose: true }) as Move[]
      const move = findMove(moves, 'd10', 'd12')
      expect(move?.san).toBe('Td12^')
    })

    //TODO: handle checkmate suffix (#)
    it('should generate SAN with checkmate suffix (#)', () => {
      // Setup FEN where moving Tank from e11 to f11 checkmates blue commander at f12 (simplified example)
      const fen = '5ct4/3T1i5/11/11/11/11/11/11/11/11/11/4C6 r - - 0 1'
      const game = new CoTuLenh(fen)
      // Manually verify this position is actually checkmate after Te11-f11
      // This might require a more complex setup for a realistic checkmate
      const moves = game.moves({ square: 'd11', verbose: true }) as Move[]
      const move = findMove(moves, 'd11', 'd12')
      expect(move?.san).toBe('Td12#')
    })
  })

  // ... other describe blocks ...
})
