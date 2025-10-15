import { describe, test, expect, beforeAll } from 'vitest'
import { CircleMasks } from '../../src/bitboard/circle-masks'
import { BitboardUtils } from '../../src/bitboard/bitboard-utils'

describe('Circle Masks', () => {
  beforeAll(() => {
    // Ensure initialization (though auto-initialized on module load)
    CircleMasks.initialize()
  })

  describe('initialization', () => {
    test('is initialized on module load', () => {
      expect(CircleMasks.isInitialized()).toBe(true)
    })

    test('has pre-computed radii 1, 2, 3', () => {
      const radii = CircleMasks.getAvailableRadii()
      expect(radii).toEqual([1, 2, 3])
    })

    test('valid board mask is initialized', () => {
      const mask = CircleMasks.getValidBoardMask()
      expect(mask).not.toBe(0n)
      expect(BitboardUtils.popCount(mask)).toBe(144) // 12x12
    })
  })

  describe('getCircle', () => {
    test('returns non-empty mask for radius 1', () => {
      const circle = CircleMasks.getCircle(1)
      expect(circle).not.toBe(0n)
      expect(BitboardUtils.popCount(circle)).toBeGreaterThan(0)
    })

    test('returns non-empty mask for radius 2', () => {
      const circle = CircleMasks.getCircle(2)
      expect(circle).not.toBe(0n)
      expect(BitboardUtils.popCount(circle)).toBeGreaterThan(0)
    })

    test('returns non-empty mask for radius 3', () => {
      const circle = CircleMasks.getCircle(3)
      expect(circle).not.toBe(0n)
      expect(BitboardUtils.popCount(circle)).toBeGreaterThan(0)
    })

    test('radius 2 contains more squares than radius 1', () => {
      const r1 = CircleMasks.getCircle(1)
      const r2 = CircleMasks.getCircle(2)

      expect(BitboardUtils.popCount(r2)).toBeGreaterThan(
        BitboardUtils.popCount(r1),
      )
    })

    test('radius 3 contains more squares than radius 2', () => {
      const r2 = CircleMasks.getCircle(2)
      const r3 = CircleMasks.getCircle(3)

      expect(BitboardUtils.popCount(r3)).toBeGreaterThan(
        BitboardUtils.popCount(r2),
      )
    })

    test('center square is included in all circles', () => {
      const center = BitboardUtils.singleBit(6, 6)

      expect(CircleMasks.getCircle(1) & center).not.toBe(0n)
      expect(CircleMasks.getCircle(2) & center).not.toBe(0n)
      expect(CircleMasks.getCircle(3) & center).not.toBe(0n)
    })
  })

  describe('circle properties', () => {
    test('radius 1 circle has expected size', () => {
      const circle = CircleMasks.getCircle(1)
      const count = BitboardUtils.popCount(circle)

      // Radius 1 with Euclidean distance <= 1.0
      // Should include center + 4 orthogonal = 5 squares
      // (diagonals are at distance sqrt(2) ≈ 1.414, excluded)
      expect(count).toBe(5)
    })

    test('radius 1 includes orthogonal neighbors', () => {
      const circle = CircleMasks.getCircle(1)

      // Check orthogonal neighbors of center (6,6)
      expect(BitboardUtils.isSet(circle, 6, 7)).toBe(true) // North
      expect(BitboardUtils.isSet(circle, 6, 5)).toBe(true) // South
      expect(BitboardUtils.isSet(circle, 7, 6)).toBe(true) // East
      expect(BitboardUtils.isSet(circle, 5, 6)).toBe(true) // West
    })

    test('radius 1 excludes diagonal neighbors (distance > 1)', () => {
      const circle = CircleMasks.getCircle(1)

      // Diagonal distance from center is sqrt(2) ≈ 1.414, which is > 1.0
      // So diagonals should NOT be included with radius 1 (strict Euclidean)
      expect(BitboardUtils.isSet(circle, 7, 7)).toBe(false) // NE
      expect(BitboardUtils.isSet(circle, 5, 7)).toBe(false) // NW
      expect(BitboardUtils.isSet(circle, 7, 5)).toBe(false) // SE
      expect(BitboardUtils.isSet(circle, 5, 5)).toBe(false) // SW
    })

    test('radius 2 includes diagonal neighbors', () => {
      const circle = CircleMasks.getCircle(2)

      // Diagonal distance sqrt(2) ≈ 1.414 is within radius 2
      expect(BitboardUtils.isSet(circle, 7, 7)).toBe(true) // NE diagonal from center
      expect(BitboardUtils.isSet(circle, 5, 7)).toBe(true) // NW diagonal from center
    })

    test('radius 2 covers larger area', () => {
      const circle = CircleMasks.getCircle(2)

      // Should include squares 2 steps away
      expect(BitboardUtils.isSet(circle, 6, 8)).toBe(true) // 2 north
      expect(BitboardUtils.isSet(circle, 6, 4)).toBe(true) // 2 south
      expect(BitboardUtils.isSet(circle, 8, 6)).toBe(true) // 2 east
      expect(BitboardUtils.isSet(circle, 4, 6)).toBe(true) // 2 west
    })
  })

  describe('slideCircleToPosition', () => {
    test('sliding to center position preserves circle', () => {
      const original = CircleMasks.getCircle(1)
      const slid = CircleMasks.slideCircleToPosition(original, 6, 6)

      // Should be identical (no offset)
      expect(slid).toBe(original)
    })

    test('sliding to a0 moves circle to corner', () => {
      const circle = CircleMasks.getCircle(1)
      const slid = CircleMasks.slideCircleToPosition(circle, 0, 0)

      // Center should now be at a0
      expect(BitboardUtils.isSet(slid, 0, 0)).toBe(true)

      // Original center should be clear
      expect(BitboardUtils.isSet(slid, 6, 6)).toBe(false)
    })

    test('sliding to l11 moves circle to opposite corner', () => {
      const circle = CircleMasks.getCircle(1)
      const slid = CircleMasks.slideCircleToPosition(circle, 11, 11)

      // Center should now be at l11
      expect(BitboardUtils.isSet(slid, 11, 11)).toBe(true)

      // Original center should be clear
      expect(BitboardUtils.isSet(slid, 6, 6)).toBe(false)
    })

    test('sliding to e5 centers circle correctly', () => {
      const circle = CircleMasks.getCircle(1)
      const slid = CircleMasks.slideCircleToPosition(circle, 4, 4)

      // Center should be at e5 (4,4)
      expect(BitboardUtils.isSet(slid, 4, 4)).toBe(true)

      // Check neighbors
      expect(BitboardUtils.isSet(slid, 4, 5)).toBe(true) // North
      expect(BitboardUtils.isSet(slid, 5, 4)).toBe(true) // East
    })

    test('clipping works at board edges', () => {
      const circle = CircleMasks.getCircle(2)
      const slid = CircleMasks.slideCircleToPosition(circle, 0, 0)

      // Should only include squares within board (0-11)
      const positions = BitboardUtils.getBitPositions(slid)

      for (const pos of positions) {
        const [file, rank] = BitboardUtils.bitToSquare(pos)
        expect(file).toBeGreaterThanOrEqual(0)
        expect(file).toBeLessThan(12)
        expect(rank).toBeGreaterThanOrEqual(0)
        expect(rank).toBeLessThan(12)
      }
    })

    test('sliding preserves approximate circle count in center', () => {
      const circle = CircleMasks.getCircle(2)
      const originalCount = BitboardUtils.popCount(circle)

      // Slide to another center position
      const slid = CircleMasks.slideCircleToPosition(circle, 6, 5)
      const slidCount = BitboardUtils.popCount(slid)

      // Should be very close (might differ by 1-2 due to clipping)
      expect(Math.abs(slidCount - originalCount)).toBeLessThanOrEqual(2)
    })

    test('sliding to edge reduces circle size', () => {
      const circle = CircleMasks.getCircle(3)
      const centerCount = BitboardUtils.popCount(circle)

      // Slide to corner
      const slid = CircleMasks.slideCircleToPosition(circle, 0, 0)
      const cornerCount = BitboardUtils.popCount(slid)

      // Corner should have fewer squares (clipped)
      expect(cornerCount).toBeLessThan(centerCount)
    })
  })

  describe('valid board mask', () => {
    test('includes all 144 board squares', () => {
      const mask = CircleMasks.getValidBoardMask()
      expect(BitboardUtils.popCount(mask)).toBe(144)
    })

    test('includes a0', () => {
      const mask = CircleMasks.getValidBoardMask()
      expect(BitboardUtils.isSet(mask, 0, 0)).toBe(true)
    })

    test('includes l11', () => {
      const mask = CircleMasks.getValidBoardMask()
      expect(BitboardUtils.isSet(mask, 11, 11)).toBe(true)
    })

    test('includes e5 center', () => {
      const mask = CircleMasks.getValidBoardMask()
      expect(BitboardUtils.isSet(mask, 5, 5)).toBe(true)
    })

    test('all squares are within 12x12', () => {
      const mask = CircleMasks.getValidBoardMask()
      const positions = BitboardUtils.getBitPositions(mask)

      for (const pos of positions) {
        const [file, rank] = BitboardUtils.bitToSquare(pos)
        expect(file).toBeGreaterThanOrEqual(0)
        expect(file).toBeLessThan(12)
        expect(rank).toBeGreaterThanOrEqual(0)
        expect(rank).toBeLessThan(12)
      }
    })
  })

  describe('integration tests', () => {
    test('can generate air defense zone for any board position', () => {
      const radius = 2

      // Test multiple positions
      const positions = [
        [0, 0], // Corner
        [5, 5], // Center
        [11, 11], // Opposite corner
        [0, 11], // Edge
        [11, 0], // Edge
      ]

      for (const [file, rank] of positions) {
        const circle = CircleMasks.getCircle(radius)
        const zone = CircleMasks.slideCircleToPosition(circle, file, rank)

        expect(zone).not.toBe(0n)
        expect(BitboardUtils.isSet(zone, file, rank)).toBe(true)
      }
    })

    test('overlapping zones can be combined', () => {
      const circle = CircleMasks.getCircle(2)

      const zone1 = CircleMasks.slideCircleToPosition(circle, 3, 3)
      const zone2 = CircleMasks.slideCircleToPosition(circle, 5, 3)

      // Combine zones with OR
      const combined = zone1 | zone2

      // Combined should be larger than either individual
      expect(BitboardUtils.popCount(combined)).toBeGreaterThan(
        BitboardUtils.popCount(zone1),
      )
      expect(BitboardUtils.popCount(combined)).toBeGreaterThan(
        BitboardUtils.popCount(zone2),
      )

      // But less than sum (due to overlap)
      const sum = BitboardUtils.popCount(zone1) + BitboardUtils.popCount(zone2)
      expect(BitboardUtils.popCount(combined)).toBeLessThan(sum)
    })

    test('can check if position is in zone', () => {
      const circle = CircleMasks.getCircle(1)
      const zone = CircleMasks.slideCircleToPosition(circle, 5, 5)

      // Position is in zone
      expect(BitboardUtils.isSet(zone, 5, 5)).toBe(true)
      expect(BitboardUtils.isSet(zone, 5, 6)).toBe(true)

      // Position far away is not in zone
      expect(BitboardUtils.isSet(zone, 10, 10)).toBe(false)
    })
  })
})
