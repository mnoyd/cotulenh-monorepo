import { describe, test, expect } from 'vitest'
import { AirDefenseBitboard } from '../../src/bitboard/air-defense-bitboard'
import { BitboardUtils } from '../../src/bitboard/bitboard-utils'
import { Piece } from '../../src/type'

// Helper to create pieces
const createPiece = (
  type: Piece['type'],
  color: Piece['color'],
  heroic = false,
): Piece => ({
  type,
  color,
  heroic,
})

// Helper to create empty board
const createEmptyBoard = (): (Piece | null)[] => {
  return Array(256).fill(null)
}

// Helper to place piece on board (0x88 format)
const placePiece = (
  board: (Piece | null)[],
  file: number,
  rank: number,
  piece: Piece,
): void => {
  const square0x88 = rank * 16 + file
  board[square0x88] = piece
}

describe('Air Defense Bitboard', () => {
  describe('getBaseAirDefenseRadius', () => {
    test('Navy has radius 1', () => {
      expect(AirDefenseBitboard.getBaseAirDefenseRadius('n')).toBe(1)
    })

    test('Anti-Air has radius 1', () => {
      expect(AirDefenseBitboard.getBaseAirDefenseRadius('g')).toBe(1)
    })

    test('Missile has radius 2', () => {
      expect(AirDefenseBitboard.getBaseAirDefenseRadius('s')).toBe(2)
    })

    test('Tank has no air defense', () => {
      expect(AirDefenseBitboard.getBaseAirDefenseRadius('t')).toBe(0)
    })

    test('Cannon has no air defense', () => {
      expect(AirDefenseBitboard.getBaseAirDefenseRadius('c')).toBe(0)
    })
  })

  describe('providesAirDefense', () => {
    test('Navy provides air defense', () => {
      expect(AirDefenseBitboard.providesAirDefense('n')).toBe(true)
    })

    test('Anti-Air provides air defense', () => {
      expect(AirDefenseBitboard.providesAirDefense('g')).toBe(true)
    })

    test('Missile provides air defense', () => {
      expect(AirDefenseBitboard.providesAirDefense('s')).toBe(true)
    })

    test('Tank does not provide air defense', () => {
      expect(AirDefenseBitboard.providesAirDefense('t')).toBe(false)
    })
  })

  describe('calculatePieceZone', () => {
    test('Navy creates radius 1 zone', () => {
      const navy = createPiece('n', 'r')
      const zone = AirDefenseBitboard.calculatePieceZone(navy, 5, 5)

      expect(zone).not.toBe(0n)
      expect(BitboardUtils.isSet(zone, 5, 5)).toBe(true) // Center
      expect(BitboardUtils.isSet(zone, 5, 6)).toBe(true) // North
      expect(BitboardUtils.isSet(zone, 6, 5)).toBe(true) // East
    })

    test('Heroic Navy creates radius 2 zone', () => {
      const heroicNavy = createPiece('n', 'r', true)
      const zone = AirDefenseBitboard.calculatePieceZone(heroicNavy, 5, 5)

      const count = BitboardUtils.popCount(zone)
      // Radius 2 should have more squares than radius 1
      expect(count).toBeGreaterThan(5)
    })

    test('Missile creates radius 2 zone', () => {
      const missile = createPiece('s', 'r')
      const zone = AirDefenseBitboard.calculatePieceZone(missile, 5, 5)

      expect(BitboardUtils.isSet(zone, 5, 7)).toBe(true) // 2 north
      expect(BitboardUtils.isSet(zone, 7, 5)).toBe(true) // 2 east
    })

    test('Heroic Missile creates radius 3 zone', () => {
      const heroicMissile = createPiece('s', 'r', true)
      const zone = AirDefenseBitboard.calculatePieceZone(heroicMissile, 5, 5)

      expect(BitboardUtils.isSet(zone, 5, 8)).toBe(true) // 3 north
      expect(BitboardUtils.isSet(zone, 8, 5)).toBe(true) // 3 east
    })

    test('Tank provides no zone', () => {
      const tank = createPiece('t', 'r')
      const zone = AirDefenseBitboard.calculatePieceZone(tank, 5, 5)

      expect(zone).toBe(0n)
    })
  })

  describe('calculateAirDefense', () => {
    test('empty board has no air defense', () => {
      const board = createEmptyBoard()
      const result = AirDefenseBitboard.calculateAirDefense(board)

      expect(result.redZone).toBe(0n)
      expect(result.blackZone).toBe(0n)
      expect(result.combinedZone).toBe(0n)
    })

    test('single red Navy creates red zone', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('n', 'r'))

      const result = AirDefenseBitboard.calculateAirDefense(board)

      expect(result.redZone).not.toBe(0n)
      expect(result.blackZone).toBe(0n)
      expect(BitboardUtils.isSet(result.redZone, 5, 5)).toBe(true)
    })

    test('single black Navy creates black zone', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('n', 'b'))

      const result = AirDefenseBitboard.calculateAirDefense(board)

      expect(result.redZone).toBe(0n)
      expect(result.blackZone).not.toBe(0n)
      expect(BitboardUtils.isSet(result.blackZone, 5, 5)).toBe(true)
    })

    test('multiple pieces combine zones', () => {
      const board = createEmptyBoard()
      placePiece(board, 3, 3, createPiece('n', 'r'))
      placePiece(board, 7, 7, createPiece('n', 'r'))

      const result = AirDefenseBitboard.calculateAirDefense(board)

      // Both positions should be defended
      expect(BitboardUtils.isSet(result.redZone, 3, 3)).toBe(true)
      expect(BitboardUtils.isSet(result.redZone, 7, 7)).toBe(true)

      // Combined zone should be larger
      const count = BitboardUtils.popCount(result.redZone)
      expect(count).toBeGreaterThan(5)
    })

    test('overlapping zones merge correctly', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('n', 'r')) // radius 1
      placePiece(board, 6, 5, createPiece('n', 'r')) // radius 1, adjacent

      const result = AirDefenseBitboard.calculateAirDefense(board)

      // Center point between them should be defended
      expect(BitboardUtils.isSet(result.redZone, 5, 5)).toBe(true)
      expect(BitboardUtils.isSet(result.redZone, 6, 5)).toBe(true)
    })

    test('different colors create separate zones', () => {
      const board = createEmptyBoard()
      placePiece(board, 2, 2, createPiece('n', 'r'))
      placePiece(board, 8, 8, createPiece('n', 'b'))

      const result = AirDefenseBitboard.calculateAirDefense(board)

      expect(result.redZone).not.toBe(0n)
      expect(result.blackZone).not.toBe(0n)
      expect(BitboardUtils.isSet(result.redZone, 2, 2)).toBe(true)
      expect(BitboardUtils.isSet(result.blackZone, 8, 8)).toBe(true)
      expect(BitboardUtils.isSet(result.redZone, 8, 8)).toBe(false)
      expect(BitboardUtils.isSet(result.blackZone, 2, 2)).toBe(false)
    })

    test('combined zone is union of both colors', () => {
      const board = createEmptyBoard()
      placePiece(board, 2, 2, createPiece('n', 'r'))
      placePiece(board, 8, 8, createPiece('n', 'b'))

      const result = AirDefenseBitboard.calculateAirDefense(board)

      expect(BitboardUtils.isSet(result.combinedZone, 2, 2)).toBe(true)
      expect(BitboardUtils.isSet(result.combinedZone, 8, 8)).toBe(true)

      const redCount = BitboardUtils.popCount(result.redZone)
      const blackCount = BitboardUtils.popCount(result.blackZone)
      const combinedCount = BitboardUtils.popCount(result.combinedZone)

      // Combined should be at most sum (could be less if overlapping)
      expect(combinedCount).toBeLessThanOrEqual(redCount + blackCount)
      expect(combinedCount).toBeGreaterThanOrEqual(
        Math.max(redCount, blackCount),
      )
    })

    test('pieces without air defense are ignored', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('t', 'r')) // Tank - no air defense

      const result = AirDefenseBitboard.calculateAirDefense(board)

      expect(result.redZone).toBe(0n)
      expect(result.blackZone).toBe(0n)
    })

    test('mixed piece types', () => {
      const board = createEmptyBoard()
      placePiece(board, 3, 3, createPiece('n', 'r')) // Navy radius 1
      placePiece(board, 6, 6, createPiece('s', 'r')) // Missile radius 2
      placePiece(board, 9, 9, createPiece('g', 'r')) // Anti-Air radius 1

      const result = AirDefenseBitboard.calculateAirDefense(board)

      expect(result.redZone).not.toBe(0n)

      // All centers should be defended
      expect(BitboardUtils.isSet(result.redZone, 3, 3)).toBe(true)
      expect(BitboardUtils.isSet(result.redZone, 6, 6)).toBe(true)
      expect(BitboardUtils.isSet(result.redZone, 9, 9)).toBe(true)
    })
  })

  describe('calculateColorZone', () => {
    test('gets red zone only', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('n', 'r'))
      placePiece(board, 7, 7, createPiece('n', 'b'))

      const redZone = AirDefenseBitboard.calculateColorZone(board, 'r')

      expect(BitboardUtils.isSet(redZone, 5, 5)).toBe(true)
      expect(BitboardUtils.isSet(redZone, 7, 7)).toBe(false)
    })

    test('gets black zone only', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('n', 'r'))
      placePiece(board, 7, 7, createPiece('n', 'b'))

      const blackZone = AirDefenseBitboard.calculateColorZone(board, 'b')

      expect(BitboardUtils.isSet(blackZone, 7, 7)).toBe(true)
      expect(BitboardUtils.isSet(blackZone, 5, 5)).toBe(false)
    })
  })

  describe('isSquareDefended', () => {
    test('detects defended square', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('n', 'r'))

      const result = AirDefenseBitboard.calculateAirDefense(board)

      expect(AirDefenseBitboard.isSquareDefended(result.redZone, 5, 5)).toBe(
        true,
      )
      expect(AirDefenseBitboard.isSquareDefended(result.redZone, 5, 6)).toBe(
        true,
      )
    })

    test('detects undefended square', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('n', 'r'))

      const result = AirDefenseBitboard.calculateAirDefense(board)

      expect(AirDefenseBitboard.isSquareDefended(result.redZone, 10, 10)).toBe(
        false,
      )
    })
  })

  describe('getDefendedSquares', () => {
    test('returns all defended squares', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('n', 'r'))

      const result = AirDefenseBitboard.calculateAirDefense(board)
      const squares = AirDefenseBitboard.getDefendedSquares(result.redZone)

      expect(squares.length).toBeGreaterThan(0)
      expect(squares).toContainEqual([5, 5]) // Center
      expect(squares).toContainEqual([5, 6]) // North
    })
  })

  describe('countDefendedSquares', () => {
    test('counts Navy zone correctly', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('n', 'r'))

      const result = AirDefenseBitboard.calculateAirDefense(board)
      const count = AirDefenseBitboard.countDefendedSquares(result.redZone)

      expect(count).toBe(5) // Radius 1 = center + 4 orthogonal
    })
  })

  describe('zone operations', () => {
    test('intersectZones finds common coverage', () => {
      const board = createEmptyBoard()
      placePiece(board, 5, 5, createPiece('s', 'r')) // Missile radius 2
      placePiece(board, 6, 5, createPiece('s', 'r')) // Missile radius 2, adjacent

      const result = AirDefenseBitboard.calculateAirDefense(board)

      // Calculate individual zones
      const zone1 = AirDefenseBitboard.calculatePieceZone(
        createPiece('s', 'r'),
        5,
        5,
      )
      const zone2 = AirDefenseBitboard.calculatePieceZone(
        createPiece('s', 'r'),
        6,
        5,
      )

      const intersection = AirDefenseBitboard.intersectZones(zone1, zone2)

      // Intersection should be smaller than either zone
      expect(BitboardUtils.popCount(intersection)).toBeLessThan(
        BitboardUtils.popCount(zone1),
      )
      expect(BitboardUtils.popCount(intersection)).toBeGreaterThan(0)
    })

    test('unionZones combines coverage', () => {
      const zone1 = AirDefenseBitboard.calculatePieceZone(
        createPiece('n', 'r'),
        3,
        3,
      )
      const zone2 = AirDefenseBitboard.calculatePieceZone(
        createPiece('n', 'r'),
        7,
        7,
      )

      const union = AirDefenseBitboard.unionZones(zone1, zone2)

      expect(BitboardUtils.popCount(union)).toBeGreaterThanOrEqual(
        BitboardUtils.popCount(zone1),
      )
      expect(BitboardUtils.popCount(union)).toBeGreaterThanOrEqual(
        BitboardUtils.popCount(zone2),
      )
    })

    test('subtractZones finds unique coverage', () => {
      const zone1 = AirDefenseBitboard.calculatePieceZone(
        createPiece('s', 'r'),
        5,
        5,
      )
      const zone2 = AirDefenseBitboard.calculatePieceZone(
        createPiece('n', 'r'),
        5,
        5,
      )

      const difference = AirDefenseBitboard.subtractZones(zone1, zone2)

      // Difference should be zone1 areas not covered by zone2
      expect(BitboardUtils.popCount(difference)).toBeLessThan(
        BitboardUtils.popCount(zone1),
      )
    })
  })

  describe('edge cases', () => {
    test('corner pieces handle clipping', () => {
      const board = createEmptyBoard()
      placePiece(board, 0, 0, createPiece('s', 'r')) // Corner with radius 2

      const result = AirDefenseBitboard.calculateAirDefense(board)

      // Should work without errors
      expect(result.redZone).not.toBe(0n)
      expect(BitboardUtils.isSet(result.redZone, 0, 0)).toBe(true)
    })

    test('opposite corner pieces', () => {
      const board = createEmptyBoard()
      placePiece(board, 11, 11, createPiece('s', 'r'))

      const result = AirDefenseBitboard.calculateAirDefense(board)

      expect(result.redZone).not.toBe(0n)
      expect(BitboardUtils.isSet(result.redZone, 11, 11)).toBe(true)
    })

    test('heroic status increases radius', () => {
      const board1 = createEmptyBoard()
      placePiece(board1, 5, 5, createPiece('n', 'r', false))

      const board2 = createEmptyBoard()
      placePiece(board2, 5, 5, createPiece('n', 'r', true))

      const result1 = AirDefenseBitboard.calculateAirDefense(board1)
      const result2 = AirDefenseBitboard.calculateAirDefense(board2)

      const count1 = BitboardUtils.popCount(result1.redZone)
      const count2 = BitboardUtils.popCount(result2.redZone)

      expect(count2).toBeGreaterThan(count1)
    })
  })
})
