import { describe, test, expect } from 'vitest'
import {
  Bitboard,
  BitboardUtils,
  EMPTY_BITBOARD,
  BOARD_STRIDE,
} from '../../src/bitboard/bitboard-utils'

describe('Bitboard Utils', () => {
  describe('squareToBit', () => {
    test('converts e5 (file 4, rank 4) correctly', () => {
      const bit = BitboardUtils.squareToBit(4, 4)
      expect(bit).toBe(4 * 16 + 4) // 68
    })

    test('converts a0 (file 0, rank 0) correctly', () => {
      const bit = BitboardUtils.squareToBit(0, 0)
      expect(bit).toBe(0)
    })

    test('converts l11 (file 11, rank 11) correctly', () => {
      const bit = BitboardUtils.squareToBit(11, 11)
      expect(bit).toBe(11 * 16 + 11) // 187
    })
  })

  describe('bitToSquare', () => {
    test('converts bit 68 back to e5', () => {
      const [file, rank] = BitboardUtils.bitToSquare(68)
      expect(file).toBe(4)
      expect(rank).toBe(4)
    })

    test('converts bit 0 back to a0', () => {
      const [file, rank] = BitboardUtils.bitToSquare(0)
      expect(file).toBe(0)
      expect(rank).toBe(0)
    })

    test('round trip conversion', () => {
      const [f, r] = BitboardUtils.bitToSquare(BitboardUtils.squareToBit(4, 4))
      expect(f).toBe(4)
      expect(r).toBe(4)
    })
  })

  describe('singleBit', () => {
    test('creates bitboard with only e5 set', () => {
      const bb = BitboardUtils.singleBit(4, 4)
      expect(bb).not.toBe(0n)
      expect(BitboardUtils.popCount(bb)).toBe(1)
      expect(BitboardUtils.isSet(bb, 4, 4)).toBe(true)
    })

    test('creates bitboard with only a0 set', () => {
      const bb = BitboardUtils.singleBit(0, 0)
      expect(bb).toBe(1n)
      expect(BitboardUtils.isSet(bb, 0, 0)).toBe(true)
    })
  })

  describe('isSet', () => {
    test('returns true for set bit', () => {
      const bb = BitboardUtils.singleBit(4, 4)
      expect(BitboardUtils.isSet(bb, 4, 4)).toBe(true)
    })

    test('returns false for unset bit', () => {
      const bb = BitboardUtils.singleBit(4, 4)
      expect(BitboardUtils.isSet(bb, 5, 5)).toBe(false)
    })

    test('returns false for empty bitboard', () => {
      expect(BitboardUtils.isSet(EMPTY_BITBOARD, 4, 4)).toBe(false)
    })
  })

  describe('setBit', () => {
    test('sets a bit in empty bitboard', () => {
      const bb = BitboardUtils.setBit(EMPTY_BITBOARD, 4, 4)
      expect(BitboardUtils.isSet(bb, 4, 4)).toBe(true)
      expect(BitboardUtils.popCount(bb)).toBe(1)
    })

    test('sets multiple bits', () => {
      let bb = EMPTY_BITBOARD
      bb = BitboardUtils.setBit(bb, 0, 0)
      bb = BitboardUtils.setBit(bb, 4, 4)
      bb = BitboardUtils.setBit(bb, 11, 11)

      expect(BitboardUtils.popCount(bb)).toBe(3)
      expect(BitboardUtils.isSet(bb, 0, 0)).toBe(true)
      expect(BitboardUtils.isSet(bb, 4, 4)).toBe(true)
      expect(BitboardUtils.isSet(bb, 11, 11)).toBe(true)
    })
  })

  describe('clearBit', () => {
    test('clears a set bit', () => {
      let bb = BitboardUtils.singleBit(4, 4)
      bb = BitboardUtils.clearBit(bb, 4, 4)

      expect(bb).toBe(EMPTY_BITBOARD)
      expect(BitboardUtils.isSet(bb, 4, 4)).toBe(false)
    })

    test('clearing unset bit has no effect', () => {
      const bb = BitboardUtils.singleBit(4, 4)
      const cleared = BitboardUtils.clearBit(bb, 5, 5)

      expect(cleared).toBe(bb)
    })
  })

  describe('popCount', () => {
    test('counts zero bits in empty bitboard', () => {
      expect(BitboardUtils.popCount(EMPTY_BITBOARD)).toBe(0)
    })

    test('counts one bit', () => {
      const bb = BitboardUtils.singleBit(4, 4)
      expect(BitboardUtils.popCount(bb)).toBe(1)
    })

    test('counts multiple bits', () => {
      let bb = 0n
      bb |= BitboardUtils.singleBit(0, 0)
      bb |= BitboardUtils.singleBit(4, 4)
      bb |= BitboardUtils.singleBit(11, 11)

      expect(BitboardUtils.popCount(bb)).toBe(3)
    })

    test('counts all board squares (144)', () => {
      let bb = 0n
      for (let rank = 0; rank < 12; rank++) {
        for (let file = 0; file < 12; file++) {
          bb |= BitboardUtils.singleBit(file, rank)
        }
      }

      expect(BitboardUtils.popCount(bb)).toBe(144)
    })
  })

  describe('getLowestSetBit', () => {
    test('returns -1 for empty bitboard', () => {
      expect(BitboardUtils.getLowestSetBit(EMPTY_BITBOARD)).toBe(-1)
    })

    test('finds lowest bit at position 0', () => {
      const bb = BitboardUtils.singleBit(0, 0)
      expect(BitboardUtils.getLowestSetBit(bb)).toBe(0)
    })

    test('finds lowest bit when multiple bits set', () => {
      let bb = 0n
      bb |= BitboardUtils.singleBit(4, 4) // bit 68
      bb |= BitboardUtils.singleBit(0, 0) // bit 0
      bb |= BitboardUtils.singleBit(11, 11) // bit 187

      expect(BitboardUtils.getLowestSetBit(bb)).toBe(0)
    })

    test('finds correct bit when only high bit set', () => {
      const bb = BitboardUtils.singleBit(11, 11)
      expect(BitboardUtils.getLowestSetBit(bb)).toBe(187)
    })
  })

  describe('getBitPositions', () => {
    test('returns empty array for empty bitboard', () => {
      const positions = BitboardUtils.getBitPositions(EMPTY_BITBOARD)
      expect(positions).toEqual([])
    })

    test('returns single position', () => {
      const bb = BitboardUtils.singleBit(4, 4)
      const positions = BitboardUtils.getBitPositions(bb)

      expect(positions).toHaveLength(1)
      expect(positions[0]).toBe(68)
    })

    test('returns multiple positions', () => {
      let bb = 0n
      bb |= BitboardUtils.singleBit(0, 0)
      bb |= BitboardUtils.singleBit(4, 4)
      bb |= BitboardUtils.singleBit(11, 11)

      const positions = BitboardUtils.getBitPositions(bb)

      expect(positions).toHaveLength(3)
      expect(positions).toContain(0)
      expect(positions).toContain(68)
      expect(positions).toContain(187)
    })
  })

  describe('printBitboard', () => {
    test('does not throw error', () => {
      const bb = BitboardUtils.singleBit(4, 4)
      expect(() => BitboardUtils.printBitboard(bb, 'Test')).not.toThrow()
    })

    test('handles empty bitboard', () => {
      expect(() => BitboardUtils.printBitboard(EMPTY_BITBOARD)).not.toThrow()
    })
  })

  describe('integration tests', () => {
    test('can create a full rank', () => {
      let bb = 0n
      for (let file = 0; file < 12; file++) {
        bb |= BitboardUtils.singleBit(file, 0)
      }

      expect(BitboardUtils.popCount(bb)).toBe(12)

      // Check all files in rank 0 are set
      for (let file = 0; file < 12; file++) {
        expect(BitboardUtils.isSet(bb, file, 0)).toBe(true)
      }

      // Check rank 1 is empty
      for (let file = 0; file < 12; file++) {
        expect(BitboardUtils.isSet(bb, file, 1)).toBe(false)
      }
    })

    test('can create a full file', () => {
      let bb = 0n
      for (let rank = 0; rank < 12; rank++) {
        bb |= BitboardUtils.singleBit(0, rank)
      }

      expect(BitboardUtils.popCount(bb)).toBe(12)

      // Check all ranks in file 0 are set
      for (let rank = 0; rank < 12; rank++) {
        expect(BitboardUtils.isSet(bb, 0, rank)).toBe(true)
      }

      // Check file 1 is empty
      for (let rank = 0; rank < 12; rank++) {
        expect(BitboardUtils.isSet(bb, 1, rank)).toBe(false)
      }
    })

    test('bitwise operations work correctly', () => {
      const bb1 = BitboardUtils.singleBit(4, 4)
      const bb2 = BitboardUtils.singleBit(5, 5)

      // OR - combine
      const combined = bb1 | bb2
      expect(BitboardUtils.popCount(combined)).toBe(2)
      expect(BitboardUtils.isSet(combined, 4, 4)).toBe(true)
      expect(BitboardUtils.isSet(combined, 5, 5)).toBe(true)

      // AND - intersection (should be empty)
      const intersection = bb1 & bb2
      expect(intersection).toBe(EMPTY_BITBOARD)

      // XOR - symmetric difference
      const diff = bb1 ^ bb2
      expect(BitboardUtils.popCount(diff)).toBe(2)

      // NOT - complement
      const notBb1 = ~bb1
      expect(BitboardUtils.isSet(notBb1, 4, 4)).toBe(false)
    })
  })
})
