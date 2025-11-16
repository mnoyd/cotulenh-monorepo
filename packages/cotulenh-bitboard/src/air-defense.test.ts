/**
 * Tests for Air Defense Zone Calculator
 */

import { describe, it, expect } from 'vitest';
import {
  AirDefenseZoneCalculator,
  getAirDefenseLevel,
  BASE_AIRDEFENSE_CONFIG,
  AirDefenseResult
} from './air-defense';

describe('Air Defense Zone Calculator', () => {
  describe('getAirDefenseLevel', () => {
    it('should return correct level for anti-air', () => {
      expect(getAirDefenseLevel('g', false)).toBe(1);
      expect(getAirDefenseLevel('g', true)).toBe(2);
    });

    it('should return correct level for missile', () => {
      expect(getAirDefenseLevel('s', false)).toBe(2);
      expect(getAirDefenseLevel('s', true)).toBe(3);
    });

    it('should return correct level for navy', () => {
      expect(getAirDefenseLevel('n', false)).toBe(1);
      expect(getAirDefenseLevel('n', true)).toBe(2);
    });

    it('should return 0 for non-air-defense pieces', () => {
      expect(getAirDefenseLevel('i', false)).toBe(0);
      expect(getAirDefenseLevel('c', false)).toBe(0);
      expect(getAirDefenseLevel('t', false)).toBe(0);
    });
  });

  describe('AirDefenseZoneCalculator', () => {
    it('should initialize with empty zones', () => {
      const calculator = new AirDefenseZoneCalculator();
      const zones = calculator.getZones();

      expect(zones.red.size).toBe(0);
      expect(zones.blue.size).toBe(0);
    });

    it('should calculate zone for anti-air piece (level 1)', () => {
      const calculator = new AirDefenseZoneCalculator();

      // Place anti-air at square 60 (middle of board: rank 5, file 5)
      // Square 60 = rank 5 * 11 + file 5 = 55 + 5 = 60
      const influencedSquares = calculator.calculateZoneForSquare(60, 1);

      // Level 1 should influence squares within radius 1 (circular)
      // Should include: center + 4 orthogonal + 4 diagonal = 9 squares
      expect(influencedSquares.length).toBeGreaterThan(0);
      expect(influencedSquares).toContain(60); // center
      expect(influencedSquares).toContain(49); // up (rank 4, file 5)
      expect(influencedSquares).toContain(71); // down (rank 6, file 5)
      expect(influencedSquares).toContain(59); // left (rank 5, file 4)
      expect(influencedSquares).toContain(61); // right (rank 5, file 6)
    });

    it('should calculate zone for missile piece (level 2)', () => {
      const calculator = new AirDefenseZoneCalculator();

      // Place missile at square 60
      const influencedSquares = calculator.calculateZoneForSquare(60, 2);

      // Level 2 should influence more squares (radius 2)
      expect(influencedSquares.length).toBeGreaterThan(9);

      // Should include squares at distance 2
      expect(influencedSquares).toContain(38); // up 2 (rank 3, file 5)
      expect(influencedSquares).toContain(82); // down 2 (rank 7, file 5)
    });

    it('should add zone when calculating for piece', () => {
      const calculator = new AirDefenseZoneCalculator();

      calculator.calculateZoneForPiece(60, 'g', false, 'r');

      const zones = calculator.getZones();
      expect(zones.red.has(60)).toBe(true);
      expect(zones.red.get(60)!.length).toBeGreaterThan(0);
    });

    it('should track anti-air positions', () => {
      const calculator = new AirDefenseZoneCalculator();

      calculator.calculateZoneForPiece(60, 'g', false, 'r');
      calculator.calculateZoneForPiece(70, 's', false, 'b');

      expect(calculator.hasAntiAirAt(60, 'r')).toBe(true);
      expect(calculator.hasAntiAirAt(70, 'b')).toBe(true);
      expect(calculator.hasAntiAirAt(60, 'b')).toBe(false);
    });

    it('should detect if square is in zone', () => {
      const calculator = new AirDefenseZoneCalculator();

      // Place red anti-air at square 60
      calculator.calculateZoneForPiece(60, 'g', false, 'r');

      // Square 60 should be in red zone
      expect(calculator.isInZone(60, 'r')).toBe(true);

      // Adjacent squares should be in red zone
      expect(calculator.isInZone(49, 'r')).toBe(true);
      expect(calculator.isInZone(71, 'r')).toBe(true);

      // Far away square should not be in zone
      expect(calculator.isInZone(0, 'r')).toBe(false);
    });

    it('should get influencing pieces for a square', () => {
      const calculator = new AirDefenseZoneCalculator();

      // Place two anti-air pieces
      calculator.calculateZoneForPiece(60, 'g', false, 'r');
      calculator.calculateZoneForPiece(62, 'g', false, 'r');

      // Square 61 should be influenced by both
      const influencers = calculator.getInfluencingPieces(61, 'r');
      expect(influencers).toContain(60);
      expect(influencers).toContain(62);
    });

    it('should remove zone when piece is captured', () => {
      const calculator = new AirDefenseZoneCalculator();

      calculator.calculateZoneForPiece(60, 'g', false, 'r');
      expect(calculator.hasAntiAirAt(60, 'r')).toBe(true);

      calculator.removeZone(60, 'r');
      expect(calculator.hasAntiAirAt(60, 'r')).toBe(false);

      const zones = calculator.getZones();
      expect(zones.red.has(60)).toBe(false);
    });

    it('should update zone when piece moves', () => {
      const calculator = new AirDefenseZoneCalculator();

      calculator.calculateZoneForPiece(60, 'g', false, 'r');
      expect(calculator.hasAntiAirAt(60, 'r')).toBe(true);

      calculator.updateZone(60, 70, 'g', false, 'r');

      expect(calculator.hasAntiAirAt(60, 'r')).toBe(false);
      expect(calculator.hasAntiAirAt(70, 'r')).toBe(true);

      const zones = calculator.getZones();
      expect(zones.red.has(60)).toBe(false);
      expect(zones.red.has(70)).toBe(true);
    });

    it('should calculate all zones from piece list', () => {
      const calculator = new AirDefenseZoneCalculator();

      const pieces = [
        { square: 60, pieceType: 'g' as const, isHeroic: false, color: 'r' as const },
        { square: 70, pieceType: 's' as const, isHeroic: false, color: 'b' as const },
        { square: 80, pieceType: 'n' as const, isHeroic: true, color: 'r' as const }
      ];

      calculator.calculateAllZones(pieces);

      const zones = calculator.getZones();
      expect(zones.red.size).toBe(2); // anti-air and navy
      expect(zones.blue.size).toBe(1); // missile

      expect(zones.red.has(60)).toBe(true);
      expect(zones.red.has(80)).toBe(true);
      expect(zones.blue.has(70)).toBe(true);
    });

    it('should clear all zones', () => {
      const calculator = new AirDefenseZoneCalculator();

      calculator.calculateZoneForPiece(60, 'g', false, 'r');
      calculator.calculateZoneForPiece(70, 's', false, 'b');

      calculator.clear();

      const zones = calculator.getZones();
      expect(zones.red.size).toBe(0);
      expect(zones.blue.size).toBe(0);
      expect(calculator.hasAntiAirAt(60, 'r')).toBe(false);
      expect(calculator.hasAntiAirAt(70, 'b')).toBe(false);
    });
  });

  describe('Air Defense Movement Checker', () => {
    it('should return SAFE_PASS when no zones encountered', () => {
      const calculator = new AirDefenseZoneCalculator();

      // No anti-air pieces, so no zones
      const checker = calculator.getCheckAirDefenseZone(60, 'r', 1);

      expect(checker()).toBe(AirDefenseResult.SAFE_PASS);
      expect(checker()).toBe(AirDefenseResult.SAFE_PASS);
    });

    it('should return KAMIKAZE when entering single zone', () => {
      const calculator = new AirDefenseZoneCalculator();

      // Place anti-air at square 62
      calculator.calculateZoneForPiece(62, 'g', false, 'r');

      // Move from 60 towards 62 (offset +1)
      const checker = calculator.getCheckAirDefenseZone(60, 'r', 1);

      // First move: 60 -> 61 (entering zone)
      const result1 = checker();
      expect(result1).toBe(AirDefenseResult.KAMIKAZE);

      // Second move: 61 -> 62 (still in same zone)
      const result2 = checker();
      expect(result2).toBe(AirDefenseResult.KAMIKAZE);
    });

    it('should return DESTROYED when leaving and re-entering zone', () => {
      const calculator = new AirDefenseZoneCalculator();

      // Place anti-air at square 60 (level 1, radius 1)
      calculator.calculateZoneForPiece(60, 'g', false, 'r');

      // Move from 59 through zone and out (offset +1)
      const checker = calculator.getCheckAirDefenseZone(59, 'r', 1);

      // Move to 60 (in zone)
      expect(checker()).toBe(AirDefenseResult.KAMIKAZE);

      // Move to 61 (still in zone)
      expect(checker()).toBe(AirDefenseResult.KAMIKAZE);

      // Move to 62 (out of zone)
      expect(checker()).toBe(AirDefenseResult.DESTROYED);
    });
  });
});
