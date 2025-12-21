import { describe, it, expect } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'

describe('FEN Parsing', () => {
  it('should handle multi-digit empty square counts (e.g. 10, 11)', () => {
    // This FEN has '10' in the last rank: .../10C
    const fen =
      '2c8/5h1h3/4s2(FTM)3/11/2iag6/3n7/5A5/11/11/8S2/5H1H3/10C r - - 0 1'

    // Should not throw
    const game = new CoTuLenh(fen)

    // Check if the piece C is at the correct position (k1)
    // Rank 1 (index 11). 10 empty (0-9). C at index 10 (k1).
    const piece = game.get('k1')
    expect(piece).toBeDefined()
    expect(piece?.type).toBe('c')
    expect(piece?.heroic).toBe(false)

    // Verify b1 is empty
    expect(game.get('b1')).toBeUndefined()
  })

  it('should handle 11 empty squares', () => {
    // 11 empty squares in a rank
    const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
    const game = new CoTuLenh(fen)
    expect(game.fen().startsWith('11/11/')).toBe(true)
  })
})
