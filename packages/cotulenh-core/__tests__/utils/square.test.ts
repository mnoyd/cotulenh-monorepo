/**
 * Unit tests for square utilities
 */

import { describe, it, expect } from 'vitest'
import {
  getFile,
  getRank,
  isValidSquare,
  fileRankToSquare,
  algebraicToSquare,
  squareToAlgebraic,
  getFileLetter,
  getRankNumber,
  distance,
  manhattanDistance,
  sameFile,
  sameRank,
  sameDiagonal,
  allSquares,
  SQUARE_MAP,
} from '../../src/utils/square'

describe('Square utilities', () => {
  describe('getFile and getRank', () => {
    it('should extract file and rank from a12', () => {
      expect(getFile(0x00)).toBe(0)
      expect(getRank(0x00)).toBe(0)
    })

    it('should extract file and rank from k12', () => {
      expect(getFile(0x0a)).toBe(10)
      expect(getRank(0x0a)).toBe(0)
    })

    it('should extract file and rank from a1', () => {
      expect(getFile(0xb0)).toBe(0)
      expect(getRank(0xb0)).toBe(11)
    })

    it('should extract file and rank from k1', () => {
      expect(getFile(0xba)).toBe(10)
      expect(getRank(0xba)).toBe(11)
    })

    it('should extract file and rank from e5', () => {
      expect(getFile(0x74)).toBe(4)
      expect(getRank(0x74)).toBe(7)
    })
  })

  describe('isValidSquare', () => {
    it('should validate corner squares', () => {
      expect(isValidSquare(0x00)).toBe(true) // a12
      expect(isValidSquare(0x0a)).toBe(true) // k12
      expect(isValidSquare(0xb0)).toBe(true) // a1
      expect(isValidSquare(0xba)).toBe(true) // k1
    })

    it('should invalidate file 11+', () => {
      expect(isValidSquare(0x0b)).toBe(false)
      expect(isValidSquare(0x0f)).toBe(false)
    })

    it('should invalidate rank 12+', () => {
      expect(isValidSquare(0xc0)).toBe(false)
      expect(isValidSquare(0xf0)).toBe(false)
    })
  })

  describe('fileRankToSquare', () => {
    it('should encode a12', () => {
      expect(fileRankToSquare(0, 0)).toBe(0x00)
    })

    it('should encode k12', () => {
      expect(fileRankToSquare(10, 0)).toBe(0x0a)
    })

    it('should encode a1', () => {
      expect(fileRankToSquare(0, 11)).toBe(0xb0)
    })

    it('should encode k1', () => {
      expect(fileRankToSquare(10, 11)).toBe(0xba)
    })

    it('should encode e5', () => {
      expect(fileRankToSquare(4, 7)).toBe(0x74)
    })
  })

  describe('algebraicToSquare', () => {
    it('should convert a12', () => {
      expect(algebraicToSquare('a12')).toBe(0x00)
    })

    it('should convert k12', () => {
      expect(algebraicToSquare('k12')).toBe(0x0a)
    })

    it('should convert a1', () => {
      expect(algebraicToSquare('a1')).toBe(0xb0)
    })

    it('should convert k1', () => {
      expect(algebraicToSquare('k1')).toBe(0xba)
    })

    it('should convert e5', () => {
      expect(algebraicToSquare('e5')).toBe(0x74)
    })

    it('should throw on invalid notation', () => {
      expect(() => algebraicToSquare('z5')).toThrow()
      expect(() => algebraicToSquare('e13')).toThrow()
      expect(() => algebraicToSquare('e0')).toThrow()
    })
  })

  describe('squareToAlgebraic', () => {
    it('should convert 0x00 to a12', () => {
      expect(squareToAlgebraic(0x00)).toBe('a12')
    })

    it('should convert 0x0A to k12', () => {
      expect(squareToAlgebraic(0x0a)).toBe('k12')
    })

    it('should convert 0xB0 to a1', () => {
      expect(squareToAlgebraic(0xb0)).toBe('a1')
    })

    it('should convert 0xBA to k1', () => {
      expect(squareToAlgebraic(0xba)).toBe('k1')
    })

    it('should convert 0x74 to e5', () => {
      expect(squareToAlgebraic(0x74)).toBe('e5')
    })

    it('should throw on invalid square', () => {
      expect(() => squareToAlgebraic(0xc0)).toThrow()
    })
  })

  describe('round-trip conversion', () => {
    it('should convert algebraic to square and back', () => {
      const notations = ['a12', 'k12', 'a1', 'k1', 'e5', 'f7', 'c3', 'h9']

      for (const notation of notations) {
        const square = algebraicToSquare(notation)
        expect(squareToAlgebraic(square)).toBe(notation)
      }
    })
  })

  describe('getFileLetter and getRankNumber', () => {
    it('should get file letter', () => {
      expect(getFileLetter(0x00)).toBe('a')
      expect(getFileLetter(0x0a)).toBe('k')
      expect(getFileLetter(0x74)).toBe('e')
    })

    it('should get rank number', () => {
      expect(getRankNumber(0x00)).toBe(12)
      expect(getRankNumber(0xb0)).toBe(1)
      expect(getRankNumber(0x74)).toBe(5)
    })
  })

  describe('distance', () => {
    it('should calculate Chebyshev distance', () => {
      const a1 = algebraicToSquare('a1')
      const a2 = algebraicToSquare('a2')
      const b2 = algebraicToSquare('b2')
      const c3 = algebraicToSquare('c3')

      expect(distance(a1, a2)).toBe(1) // One rank
      expect(distance(a1, b2)).toBe(1) // Diagonal
      expect(distance(a1, c3)).toBe(2) // Two diagonal
    })

    it('should be symmetric', () => {
      const sq1 = algebraicToSquare('e5')
      const sq2 = algebraicToSquare('h8')

      expect(distance(sq1, sq2)).toBe(distance(sq2, sq1))
    })
  })

  describe('manhattanDistance', () => {
    it('should calculate Manhattan distance', () => {
      const a1 = algebraicToSquare('a1')
      const a2 = algebraicToSquare('a2')
      const b2 = algebraicToSquare('b2')
      const c3 = algebraicToSquare('c3')

      expect(manhattanDistance(a1, a2)).toBe(1)
      expect(manhattanDistance(a1, b2)).toBe(2) // 1 file + 1 rank
      expect(manhattanDistance(a1, c3)).toBe(4) // 2 files + 2 ranks
    })
  })

  describe('sameFile, sameRank, sameDiagonal', () => {
    it('should detect same file', () => {
      const e5 = algebraicToSquare('e5')
      const e8 = algebraicToSquare('e8')
      const f5 = algebraicToSquare('f5')

      expect(sameFile(e5, e8)).toBe(true)
      expect(sameFile(e5, f5)).toBe(false)
    })

    it('should detect same rank', () => {
      const e5 = algebraicToSquare('e5')
      const h5 = algebraicToSquare('h5')
      const e8 = algebraicToSquare('e8')

      expect(sameRank(e5, h5)).toBe(true)
      expect(sameRank(e5, e8)).toBe(false)
    })

    it('should detect same diagonal', () => {
      const e5 = algebraicToSquare('e5')
      const f6 = algebraicToSquare('f6')
      const d4 = algebraicToSquare('d4')
      const e6 = algebraicToSquare('e6')

      expect(sameDiagonal(e5, f6)).toBe(true)
      expect(sameDiagonal(e5, d4)).toBe(true)
      expect(sameDiagonal(e5, e6)).toBe(false)
    })
  })

  describe('allSquares', () => {
    it('should generate all 132 valid squares', () => {
      const squares = Array.from(allSquares())
      expect(squares).toHaveLength(132) // 11 files × 12 ranks
    })

    it('should generate only valid squares', () => {
      for (const square of allSquares()) {
        expect(isValidSquare(square)).toBe(true)
      }
    })
  })

  describe('SQUARE_MAP', () => {
    it('should have all 132 squares', () => {
      expect(SQUARE_MAP.size).toBe(132)
    })

    it('should map notation to square correctly', () => {
      expect(SQUARE_MAP.get('a12')).toBe(0x00)
      expect(SQUARE_MAP.get('k12')).toBe(0x0a)
      expect(SQUARE_MAP.get('a1')).toBe(0xb0)
      expect(SQUARE_MAP.get('k1')).toBe(0xba)
      expect(SQUARE_MAP.get('e5')).toBe(0x74)
    })
  })
})
