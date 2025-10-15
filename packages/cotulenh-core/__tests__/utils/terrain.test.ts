/**
 * Unit tests for terrain utilities
 */

import { describe, it, expect } from 'vitest'
import {
  isNavySquare,
  isLandSquare,
  canPlaceOnSquare,
  canHeavyPieceCrossRiver,
  getTerrainZone,
  isRiverSquare,
  isBridgeSquare,
} from '../../src/utils/terrain'
import { algebraicToSquare } from '../../src/utils/square'
import {
  NAVY,
  INFANTRY,
  TANK,
  ARTILLERY,
  ANTI_AIR,
  MISSILE,
} from '../../src/types/Constants'

describe('Terrain utilities', () => {
  describe('isNavySquare', () => {
    it('should validate water squares (a-b files)', () => {
      expect(isNavySquare(algebraicToSquare('a1'))).toBe(true)
      expect(isNavySquare(algebraicToSquare('b6'))).toBe(true)
      expect(isNavySquare(algebraicToSquare('a12'))).toBe(true)
    })

    it('should validate mixed zone (c file)', () => {
      expect(isNavySquare(algebraicToSquare('c1'))).toBe(true)
      expect(isNavySquare(algebraicToSquare('c12'))).toBe(true)
    })

    it('should validate river squares', () => {
      expect(isNavySquare(algebraicToSquare('d6'))).toBe(true)
      expect(isNavySquare(algebraicToSquare('e6'))).toBe(true)
      expect(isNavySquare(algebraicToSquare('d7'))).toBe(true)
      expect(isNavySquare(algebraicToSquare('e7'))).toBe(true)
    })

    it('should reject pure land squares', () => {
      expect(isNavySquare(algebraicToSquare('d1'))).toBe(false)
      expect(isNavySquare(algebraicToSquare('f5'))).toBe(false)
      expect(isNavySquare(algebraicToSquare('k12'))).toBe(false)
    })
  })

  describe('isLandSquare', () => {
    it('should reject pure water (a-b files)', () => {
      expect(isLandSquare(algebraicToSquare('a1'))).toBe(false)
      expect(isLandSquare(algebraicToSquare('b6'))).toBe(false)
    })

    it('should validate mixed zone (c file)', () => {
      expect(isLandSquare(algebraicToSquare('c1'))).toBe(true)
      expect(isLandSquare(algebraicToSquare('c12'))).toBe(true)
    })

    it('should validate pure land (d-k files)', () => {
      expect(isLandSquare(algebraicToSquare('d1'))).toBe(true)
      expect(isLandSquare(algebraicToSquare('f5'))).toBe(true)
      expect(isLandSquare(algebraicToSquare('k12'))).toBe(true)
    })
  })

  describe('canPlaceOnSquare', () => {
    it('should allow navy on water', () => {
      expect(canPlaceOnSquare(NAVY, algebraicToSquare('a1'))).toBe(true)
      expect(canPlaceOnSquare(NAVY, algebraicToSquare('b6'))).toBe(true)
    })

    it('should allow navy on river', () => {
      expect(canPlaceOnSquare(NAVY, algebraicToSquare('d6'))).toBe(true)
      expect(canPlaceOnSquare(NAVY, algebraicToSquare('e7'))).toBe(true)
    })

    it('should not allow navy on pure land', () => {
      expect(canPlaceOnSquare(NAVY, algebraicToSquare('f5'))).toBe(false)
      expect(canPlaceOnSquare(NAVY, algebraicToSquare('k12'))).toBe(false)
    })

    it('should allow land pieces on land', () => {
      expect(canPlaceOnSquare(INFANTRY, algebraicToSquare('d1'))).toBe(true)
      expect(canPlaceOnSquare(TANK, algebraicToSquare('k12'))).toBe(true)
    })

    it('should not allow land pieces on pure water', () => {
      expect(canPlaceOnSquare(INFANTRY, algebraicToSquare('a1'))).toBe(false)
      expect(canPlaceOnSquare(TANK, algebraicToSquare('b6'))).toBe(false)
    })

    it('should allow land pieces on mixed zone', () => {
      expect(canPlaceOnSquare(INFANTRY, algebraicToSquare('c1'))).toBe(true)
    })
  })

  describe('canHeavyPieceCrossRiver', () => {
    it('should allow heavy pieces within same zone', () => {
      // Upper zone (ranks 7-12)
      const from = algebraicToSquare('e10')
      const to = algebraicToSquare('f8')

      expect(canHeavyPieceCrossRiver(ARTILLERY, from, to)).toBe(true)
      expect(canHeavyPieceCrossRiver(ANTI_AIR, from, to)).toBe(true)
      expect(canHeavyPieceCrossRiver(MISSILE, from, to)).toBe(true)
    })

    it('should allow heavy pieces in lower zone', () => {
      // Lower zone (ranks 1-6)
      const from = algebraicToSquare('e3')
      const to = algebraicToSquare('f5')

      expect(canHeavyPieceCrossRiver(ARTILLERY, from, to)).toBe(true)
    })

    it('should not allow crossing from upper to lower', () => {
      const from = algebraicToSquare('e8') // Upper zone
      const to = algebraicToSquare('e5') // Lower zone

      expect(canHeavyPieceCrossRiver(ARTILLERY, from, to)).toBe(false)
      expect(canHeavyPieceCrossRiver(ANTI_AIR, from, to)).toBe(false)
      expect(canHeavyPieceCrossRiver(MISSILE, from, to)).toBe(false)
    })

    it('should not allow crossing from lower to upper', () => {
      const from = algebraicToSquare('e5') // Lower zone
      const to = algebraicToSquare('e8') // Upper zone

      expect(canHeavyPieceCrossRiver(ARTILLERY, from, to)).toBe(false)
    })

    it('should allow non-heavy pieces to cross', () => {
      const from = algebraicToSquare('e8')
      const to = algebraicToSquare('e5')

      expect(canHeavyPieceCrossRiver(INFANTRY, from, to)).toBe(true)
      expect(canHeavyPieceCrossRiver(TANK, from, to)).toBe(true)
    })

    it('should allow movement in water area', () => {
      const from = algebraicToSquare('a8')
      const to = algebraicToSquare('a5')

      expect(canHeavyPieceCrossRiver(ARTILLERY, from, to)).toBe(true)
    })
  })

  describe('getTerrainZone', () => {
    it('should identify water zone', () => {
      expect(getTerrainZone(algebraicToSquare('a1'))).toBe('water')
      expect(getTerrainZone(algebraicToSquare('b12'))).toBe('water')
    })

    it('should identify mixed zone', () => {
      expect(getTerrainZone(algebraicToSquare('c1'))).toBe('mixed')
      expect(getTerrainZone(algebraicToSquare('c12'))).toBe('mixed')
    })

    it('should identify river as mixed', () => {
      expect(getTerrainZone(algebraicToSquare('d6'))).toBe('mixed')
      expect(getTerrainZone(algebraicToSquare('e7'))).toBe('mixed')
    })

    it('should identify land zone', () => {
      expect(getTerrainZone(algebraicToSquare('f1'))).toBe('land')
      expect(getTerrainZone(algebraicToSquare('k12'))).toBe('land')
    })
  })

  describe('isRiverSquare', () => {
    it('should identify river squares', () => {
      expect(isRiverSquare(algebraicToSquare('d6'))).toBe(true)
      expect(isRiverSquare(algebraicToSquare('e6'))).toBe(true)
      expect(isRiverSquare(algebraicToSquare('d7'))).toBe(true)
      expect(isRiverSquare(algebraicToSquare('e7'))).toBe(true)
    })

    it('should reject non-river squares', () => {
      expect(isRiverSquare(algebraicToSquare('c6'))).toBe(false)
      expect(isRiverSquare(algebraicToSquare('f6'))).toBe(false)
      expect(isRiverSquare(algebraicToSquare('d5'))).toBe(false)
      expect(isRiverSquare(algebraicToSquare('e8'))).toBe(false)
    })
  })

  describe('isBridgeSquare', () => {
    it('should identify bridge squares', () => {
      expect(isBridgeSquare(algebraicToSquare('f6'))).toBe(true)
      expect(isBridgeSquare(algebraicToSquare('f7'))).toBe(true)
      expect(isBridgeSquare(algebraicToSquare('h6'))).toBe(true)
      expect(isBridgeSquare(algebraicToSquare('h7'))).toBe(true)
    })

    it('should reject non-bridge squares', () => {
      expect(isBridgeSquare(algebraicToSquare('f5'))).toBe(false)
      expect(isBridgeSquare(algebraicToSquare('g6'))).toBe(false)
      expect(isBridgeSquare(algebraicToSquare('e6'))).toBe(false)
    })
  })
})
