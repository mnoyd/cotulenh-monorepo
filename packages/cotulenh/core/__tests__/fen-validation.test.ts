import { describe, it, expect } from 'vitest'
import { validateFen } from '../src/utils'

// Import the initial FEN for testing valid positions
const INITIAL_FEN =
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1'

describe('FEN Validation', () => {
  describe('structural validation', () => {
    it('accepts a valid FEN string', () => {
      const result = validateFen(INITIAL_FEN)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts FEN with all empty squares (11)', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      const result = validateFen(fen, { checkSemantics: false })
      expect(result.valid).toBe(true)
    })

    it('accepts FEN with multi-digit empty counts (10)', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/10C/11 r - - 0 1'
      const result = validateFen(fen, { checkSemantics: false })
      expect(result.valid).toBe(true)
    })

    it('rejects FEN with too few ranks', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.message.includes('Expected 12 ranks')),
      ).toBe(true)
    })

    it('rejects FEN with too many ranks', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.message.includes('Expected 12 ranks')),
      ).toBe(true)
    })

    it('rejects FEN with too few tokens', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - -'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) =>
          e.message.includes('Expected at least 6 FEN tokens'),
        ),
      ).toBe(true)
    })

    it('rejects FEN with invalid turn', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 w - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.message.includes("Invalid turn 'w'")),
      ).toBe(true)
    })

    it('rejects FEN with non-dash castling field', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r KQkq - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.message.includes('Castling field must be')),
      ).toBe(true)
    })

    it('rejects FEN with non-dash en passant field', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - e3 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) =>
          e.message.includes('En passant field must be'),
        ),
      ).toBe(true)
    })

    it('rejects FEN with negative half move count', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - - -1 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) =>
          e.message.includes('Invalid half move count'),
        ),
      ).toBe(true)
    })

    it('rejects FEN with zero move number', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 0'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.message.includes('Invalid move number')),
      ).toBe(true)
    })

    it('rejects FEN with invalid character in piece placement', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/x11/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'FEN_INVALID_PIECE')).toBe(
        true,
      )
    })

    it('rejects FEN with empty count out of range (0)', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/01/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'FEN_INVALID_FILE_COUNT'),
      ).toBe(true)
    })

    it('rejects FEN with empty count out of range (12)', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/12/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'FEN_INVALID_FILE_COUNT'),
      ).toBe(true)
    })

    it('rejects FEN with unmatched opening parenthesis', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/(c11/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'FEN_MISMATCH_PARENTHESES'),
      ).toBe(true)
    })

    it('rejects FEN with unmatched closing parenthesis', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/c)11/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'FEN_MISMATCH_PARENTHESES'),
      ).toBe(true)
    })

    it('rejects FEN with nested parentheses', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/((c))11/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.message.includes('Nested parentheses')),
      ).toBe(true)
    })

    it('rejects FEN with double heroic marker', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/++c11/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'FEN_INVALID_FORMAT')).toBe(
        true,
      )
    })

    it('rejects FEN with dangling heroic marker at end of rank', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/c1+/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'FEN_INVALID_FORMAT')).toBe(
        true,
      )
    })

    it('rejects FEN with too many squares in a rank', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/1c r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.message.includes('has 2 squares')),
      ).toBe(true)
    })

    it('rejects FEN with too few squares in a rank', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/1c1 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.message.includes('has 3 squares')),
      ).toBe(true)
    })
  })

  describe('piece placement validation', () => {
    it('accepts FEN with heroic pieces', () => {
      const fen = '+C10/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      const result = validateFen(fen, { checkSemantics: false })
      expect(result.valid).toBe(true)
    })

    it('accepts FEN with combined pieces (stacks)', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/2(cit)8 r - - 0 1'
      const result = validateFen(fen, { checkSemantics: false })
      expect(result.valid).toBe(true)
    })

    it('accepts FEN with heroic combined pieces', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/2(+cit)8 r - - 0 1'
      const result = validateFen(fen, { checkSemantics: false })
      expect(result.valid).toBe(true)
    })

    it('accepts FEN with all piece types', () => {
      const fen = 'cimteagsfn1/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      const result = validateFen(fen, { checkSemantics: false })
      expect(result.valid).toBe(true)
    })

    it('accepts FEN with red pieces (uppercase)', () => {
      const fen = 'C10/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      const result = validateFen(fen, { checkSemantics: false })
      expect(result.valid).toBe(true)
    })

    it('accepts FEN with blue pieces (lowercase)', () => {
      const fen = 'c10/11/11/11/11/11/11/11/11/11/11/11 b - - 0 1'
      const result = validateFen(fen, { checkSemantics: false })
      expect(result.valid).toBe(true)
    })
  })

  describe('semantic validation', () => {
    it('accepts valid FEN with semantic checks enabled', () => {
      const result = validateFen(INITIAL_FEN, { checkSemantics: true })
      expect(result.valid).toBe(true)
    })

    it('skips semantic validation when checkSemantics is false', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/x11/11 r - - 0 1'
      const result = validateFen(fen, { checkSemantics: false })
      expect(result.valid).toBe(false) // Still fails structural
    })

    it('detects missing commanders with semantic checks', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      const result = validateFen(fen, { checkSemantics: true })
      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) =>
          e.message.includes('Expected 1 red commander'),
        ),
      ).toBe(true)
    })
  })

  describe('round-trip validation', () => {
    it('passes round-trip test for valid FEN', () => {
      const result = validateFen(INITIAL_FEN, { roundTripTest: true })
      expect(result.valid).toBe(true)
    })

    it('does not run round-trip test when structural errors exist', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      const result = validateFen(fen, { roundTripTest: true })
      expect(result.valid).toBe(false)
      expect(result.errors.every((e) => e.category !== 'roundtrip')).toBe(true)
    })
  })

  describe('error collection', () => {
    it('collects all errors in invalid FEN', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 w - - -1 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })

    it('provides error location information', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/x11/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      const errorWithLocation = result.errors.find((e) => e.location)
      expect(errorWithLocation).toBeDefined()
      expect(errorWithLocation?.location?.rank).toBeDefined()
    })

    it('provides context for invalid characters', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/x11/11 r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)
      const invalidCharError = result.errors.find(
        (e) => e.code === 'FEN_INVALID_PIECE',
      )
      expect(invalidCharError?.location?.context).toBe('x')
    })

    it('categorizes errors correctly', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 w - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(false)

      const categories = new Set(result.errors.map((e) => e.category))
      expect(categories.has('structure')).toBe(true)
    })
  })

  describe('throwOnError option', () => {
    it('does not throw when throwOnError is false (default)', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 w - - 0 1'
      expect(() => validateFen(fen)).not.toThrow()
    })

    it('throws when throwOnError is true and FEN is invalid', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/11 w - - 0 1'
      expect(() => validateFen(fen, { throwOnError: true })).toThrow()
    })

    it('does not throw when throwOnError is true and FEN is valid', () => {
      expect(() =>
        validateFen(INITIAL_FEN, { throwOnError: true }),
      ).not.toThrow()
    })
  })

  describe('error categories', () => {
    it('reports structural errors for rank count issues', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
      const result = validateFen(fen)
      const rankError = result.errors.find((e) =>
        e.message.includes('Expected 12 ranks'),
      )
      expect(rankError?.category).toBe('structure')
    })

    it('reports lexical errors for invalid characters', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/x11/11 r - - 0 1'
      const result = validateFen(fen)
      const charError = result.errors.find(
        (e) => e.code === 'FEN_INVALID_PIECE',
      )
      expect(charError?.category).toBe('lexical')
    })

    it('reports structure errors for parentheses issues', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/(c11/11 r - - 0 1'
      const result = validateFen(fen)
      const parenError = result.errors.find(
        (e) => e.code === 'FEN_MISMATCH_PARENTHESES',
      )
      expect(parenError?.category).toBe('structure')
    })
  })

  describe('complex FEN strings', () => {
    it('handles FEN from fen-parsing-repro test', () => {
      const fen =
        '2c8/5h1h3/4s2(FTM)3/11/2iag6/3n7/5A5/11/11/8S2/5H1H3/10C r - - 0 1'
      const result = validateFen(fen)
      expect(result.valid).toBe(true)
    })

    it('handles initial board FEN', () => {
      const result = validateFen(INITIAL_FEN, { checkSemantics: true })
      expect(result.valid).toBe(true)
    })

    it('handles FEN with combined pieces (stacks)', () => {
      const fen = '11/11/11/11/11/11/11/11/11/11/11/2(cit)8 r - - 0 1'
      const result = validateFen(fen, { checkSemantics: false })
      expect(result.valid).toBe(true)
    })
  })
})
