/**
 * Coordinate System Verification Tests
 *
 * These tests verify the correct understanding of the CoTuLenh board coordinate system
 * to prevent misunderstandings when writing tests.
 */

import { describe, it, expect } from 'vitest'
import {
  algebraicToSquare,
  squareToAlgebraic,
  getFile,
  getRank,
  getRankNumber,
  getFileLetter,
} from '../../src/utils/square'
import {
  isNavySquare,
  isLandSquare,
  getTerrainZone,
  isRiverSquare,
} from '../../src/utils/terrain'

describe('Coordinate System Verification', () => {
  describe('Basic Square Conversion', () => {
    it('should correctly convert corner squares', () => {
      // Top-left corner
      expect(algebraicToSquare('a12')).toBe(0)
      expect(squareToAlgebraic(0)).toBe('a12')

      // Top-right corner
      expect(algebraicToSquare('k12')).toBe(10)
      expect(squareToAlgebraic(10)).toBe('k12')

      // Bottom-left corner
      expect(algebraicToSquare('a1')).toBe(176)
      expect(squareToAlgebraic(176)).toBe('a1')

      // Bottom-right corner
      expect(algebraicToSquare('k1')).toBe(186)
      expect(squareToAlgebraic(186)).toBe('k1')
    })

    it('should correctly handle center squares', () => {
      // Center-ish squares
      expect(algebraicToSquare('e6')).toBe(100)
      expect(squareToAlgebraic(100)).toBe('e6')

      expect(algebraicToSquare('f7')).toBe(85)
      expect(squareToAlgebraic(85)).toBe('f7')
    })

    it('should correctly extract file and rank', () => {
      const e6 = algebraicToSquare('e6') // Should be 100
      expect(getFile(e6)).toBe(4) // File 'e' = 4
      expect(getRank(e6)).toBe(6) // Internal rank 6 = display rank 6
      expect(getFileLetter(e6)).toBe('e')
      expect(getRankNumber(e6)).toBe(6)

      const a12 = algebraicToSquare('a12') // Should be 0
      expect(getFile(a12)).toBe(0) // File 'a' = 0
      expect(getRank(a12)).toBe(0) // Internal rank 0 = display rank 12
      expect(getFileLetter(a12)).toBe('a')
      expect(getRankNumber(a12)).toBe(12)
    })
  })

  describe('Rank Inversion Understanding', () => {
    it('should correctly map display ranks to internal ranks', () => {
      // Display rank 12 -> internal rank 0
      expect(getRank(algebraicToSquare('e12'))).toBe(0)
      expect(getRankNumber(algebraicToSquare('e12'))).toBe(12)

      // Display rank 1 -> internal rank 11
      expect(getRank(algebraicToSquare('e1'))).toBe(11)
      expect(getRankNumber(algebraicToSquare('e1'))).toBe(1)

      // Display rank 6 -> internal rank 6 (middle)
      expect(getRank(algebraicToSquare('e6'))).toBe(6)
      expect(getRankNumber(algebraicToSquare('e6'))).toBe(6)

      // Display rank 7 -> internal rank 5
      expect(getRank(algebraicToSquare('e7'))).toBe(5)
      expect(getRankNumber(algebraicToSquare('e7'))).toBe(7)
    })
  })

  describe('Terrain Zone Verification', () => {
    it('should correctly identify water squares (files a-b)', () => {
      // File a (water)
      expect(isNavySquare(algebraicToSquare('a6'))).toBe(true)
      expect(isLandSquare(algebraicToSquare('a6'))).toBe(false)
      expect(getTerrainZone(algebraicToSquare('a6'))).toBe('water')

      // File b (water)
      expect(isNavySquare(algebraicToSquare('b6'))).toBe(true)
      expect(isLandSquare(algebraicToSquare('b6'))).toBe(false)
      expect(getTerrainZone(algebraicToSquare('b6'))).toBe('water')
    })

    it('should correctly identify mixed squares (file c + river)', () => {
      // File c (mixed)
      expect(isNavySquare(algebraicToSquare('c6'))).toBe(true)
      expect(isLandSquare(algebraicToSquare('c6'))).toBe(true)
      expect(getTerrainZone(algebraicToSquare('c6'))).toBe('mixed')

      // River squares d6, e6, d7, e7 (mixed)
      expect(isNavySquare(algebraicToSquare('d6'))).toBe(true)
      expect(isLandSquare(algebraicToSquare('d6'))).toBe(true)
      expect(getTerrainZone(algebraicToSquare('d6'))).toBe('mixed')
      expect(isRiverSquare(algebraicToSquare('d6'))).toBe(true)

      expect(isNavySquare(algebraicToSquare('e7'))).toBe(true)
      expect(isLandSquare(algebraicToSquare('e7'))).toBe(true)
      expect(getTerrainZone(algebraicToSquare('e7'))).toBe('mixed')
      expect(isRiverSquare(algebraicToSquare('e7'))).toBe(true)
    })

    it('should correctly identify land squares (files d-k, except river)', () => {
      // File f (land, not river)
      expect(isNavySquare(algebraicToSquare('f6'))).toBe(false)
      expect(isLandSquare(algebraicToSquare('f6'))).toBe(true)
      expect(getTerrainZone(algebraicToSquare('f6'))).toBe('land')

      // File k (land)
      expect(isNavySquare(algebraicToSquare('k6'))).toBe(false)
      expect(isLandSquare(algebraicToSquare('k6'))).toBe(true)
      expect(getTerrainZone(algebraicToSquare('k6'))).toBe('land')
    })
  })

  describe('Movement Direction Understanding', () => {
    it('should correctly calculate orthogonal movements', () => {
      const e6 = algebraicToSquare('e6') // 100

      // North: rank decreases (display rank increases)
      const e7 = e6 - 16 // North = -16
      expect(squareToAlgebraic(e7)).toBe('e7')

      // South: rank increases (display rank decreases)
      const e5 = e6 + 16 // South = +16
      expect(squareToAlgebraic(e5)).toBe('e5')

      // East: file increases
      const f6 = e6 + 1 // East = +1
      expect(squareToAlgebraic(f6)).toBe('f6')

      // West: file decreases
      const d6 = e6 - 1 // West = -1
      expect(squareToAlgebraic(d6)).toBe('d6')
    })

    it('should correctly calculate diagonal movements', () => {
      const e6 = algebraicToSquare('e6') // 100

      // Northeast: rank decreases, file increases
      const f7 = e6 - 16 + 1 // -16 + 1 = -15
      expect(squareToAlgebraic(f7)).toBe('f7')

      // Southeast: rank increases, file increases
      const f5 = e6 + 16 + 1 // +16 + 1 = +17
      expect(squareToAlgebraic(f5)).toBe('f5')

      // Southwest: rank increases, file decreases
      const d5 = e6 + 16 - 1 // +16 - 1 = +15
      expect(squareToAlgebraic(d5)).toBe('d5')

      // Northwest: rank decreases, file decreases
      const d7 = e6 - 16 - 1 // -16 - 1 = -17
      expect(squareToAlgebraic(d7)).toBe('d7')
    })
  })

  describe('Common Test Scenarios', () => {
    it('should handle piece placement on correct terrain', () => {
      // Tank (land piece) should NOT be placeable on water
      const waterSquare = algebraicToSquare('a6')
      expect(isLandSquare(waterSquare)).toBe(false)

      // Tank should be placeable on land
      const landSquare = algebraicToSquare('f6')
      expect(isLandSquare(landSquare)).toBe(true)

      // Navy should be placeable on water and mixed
      expect(isNavySquare(algebraicToSquare('a6'))).toBe(true) // Water
      expect(isNavySquare(algebraicToSquare('c6'))).toBe(true) // Mixed
      expect(isNavySquare(algebraicToSquare('d6'))).toBe(true) // River (mixed)
      expect(isNavySquare(algebraicToSquare('f6'))).toBe(false) // Land
    })

    it('should correctly identify river crossing restrictions', () => {
      // River divides board at ranks 6/7
      // Upper zone: ranks 7-12 (internal ranks 0-5)
      // Lower zone: ranks 1-6 (internal ranks 6-11)

      const upperSquare = algebraicToSquare('f8') // Rank 8, internal rank 4
      const lowerSquare = algebraicToSquare('f5') // Rank 5, internal rank 7

      expect(getRank(upperSquare)).toBe(4) // Internal rank 4 (upper zone)
      expect(getRank(lowerSquare)).toBe(7) // Internal rank 7 (lower zone)

      // Heavy pieces cannot cross between these zones
      expect(getRank(upperSquare) <= 5).toBe(true) // Upper zone
      expect(getRank(lowerSquare) <= 5).toBe(false) // Lower zone
    })
  })

  describe('Edge Cases and Boundaries', () => {
    it('should handle board boundaries correctly', () => {
      // First and last files
      expect(getFile(algebraicToSquare('a6'))).toBe(0)
      expect(getFile(algebraicToSquare('k6'))).toBe(10)

      // First and last ranks
      expect(getRank(algebraicToSquare('e12'))).toBe(0)
      expect(getRank(algebraicToSquare('e1'))).toBe(11)

      // Verify no invalid squares
      expect(() => algebraicToSquare('l6')).toThrow() // File 'l' doesn't exist
      expect(() => algebraicToSquare('e13')).toThrow() // Rank 13 doesn't exist
      expect(() => algebraicToSquare('e0')).toThrow() // Rank 0 doesn't exist
    })

    it('should correctly identify commander positions in tests', () => {
      // Common test positions that avoid Flying General violations
      const redCommander = algebraicToSquare('e6')
      const blueCommander = algebraicToSquare('h9')

      // Different files - no Flying General violation
      expect(getFile(redCommander)).not.toBe(getFile(blueCommander))

      // Both on land squares
      expect(isLandSquare(redCommander)).toBe(true)
      expect(isLandSquare(blueCommander)).toBe(true)
    })
  })
})
