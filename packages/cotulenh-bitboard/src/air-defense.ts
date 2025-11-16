/**
 * Air Defense Zone Calculator for CoTuLenh bitboard engine.
 *
 * This module implements efficient calculation and management of air defense zones.
 * Anti-air pieces (anti-air, missile, navy) create zones of influence that restrict
 * air force movement.
 */

import type { Bitboard } from './bitboard';
import { EMPTY, isSet, setBit, clearBit } from './bitboard';
import type { Color, PieceSymbol } from './types';

/**
 * Configuration for air defense levels by piece type.
 * - Anti-air (g): level 1 (radius 1)
 * - Missile (s): level 2 (radius 2)
 * - Navy (n): level 1 (radius 1)
 *
 * Heroic pieces get +1 to their level.
 */
export const BASE_AIRDEFENSE_CONFIG: Partial<Record<PieceSymbol, number>> = {
  g: 1, // anti-air
  s: 2, // missile
  n: 1 // navy
};

/**
 * Gets the air defense level for a piece.
 *
 * @param pieceType - The piece type symbol
 * @param isHeroic - Whether the piece is heroic
 * @returns The air defense level (0 if piece doesn't provide air defense)
 */
export function getAirDefenseLevel(pieceType: PieceSymbol, isHeroic: boolean): number {
  const base = BASE_AIRDEFENSE_CONFIG[pieceType];
  if (!base) return 0;
  return isHeroic ? base + 1 : base;
}

/**
 * Represents air defense zones for both sides.
 * Maps anti-air piece squares to the squares they influence.
 */
export interface AirDefenseZones {
  /** Red side air defense zones: Map<anti-air square, influenced squares[]> */
  red: Map<number, number[]>;

  /** Blue side air defense zones: Map<anti-air square, influenced squares[]> */
  blue: Map<number, number[]>;
}

/**
 * Bitboards tracking anti-air piece positions for quick lookup.
 */
export interface AntiAirPositions {
  /** Bitboard of red anti-air pieces (anti-air, missile, navy) */
  red: Bitboard;

  /** Bitboard of blue anti-air pieces (anti-air, missile, navy) */
  blue: Bitboard;
}

/**
 * Enum-like constants for air defense movement results.
 * Used to determine if an air force piece can move through a square.
 */
export const AirDefenseResult = {
  /** Can safely pass through this square (no air defense) */
  SAFE_PASS: 0,
  /** Can pass but will be destroyed (kamikaze/suicide move into single zone) */
  KAMIKAZE: 1,
  /** Cannot pass, movement stops (multiple zones or re-entering zone) */
  DESTROYED: 2
} as const;

export type AirDefenseResultType = (typeof AirDefenseResult)[keyof typeof AirDefenseResult];

/**
 * Air Defense Zone Calculator manages air defense zones for the game.
 *
 * Provides efficient calculation and incremental updates of air defense zones
 * using bitboards for fast anti-air piece lookup.
 */
export class AirDefenseZoneCalculator {
  /** Air defense zones for both sides */
  private readonly zones: AirDefenseZones = {
    red: new Map(),
    blue: new Map()
  };

  /** Bitboards tracking anti-air piece positions */
  private readonly antiAirPositions: AntiAirPositions = {
    red: { ...EMPTY },
    blue: { ...EMPTY }
  };

  /**
   * Clears all air defense zones and anti-air positions.
   */
  clear(): void {
    this.zones.red.clear();
    this.zones.blue.clear();
    this.antiAirPositions.red = { ...EMPTY };
    this.antiAirPositions.blue = { ...EMPTY };
  }

  /**
   * Gets the air defense zones for both sides.
   *
   * @returns The current air defense zones
   */
  getZones(): AirDefenseZones {
    return this.zones;
  }

  /**
   * Gets the anti-air positions bitboards.
   *
   * @returns The current anti-air positions
   */
  getAntiAirPositions(): AntiAirPositions {
    return this.antiAirPositions;
  }

  /**
   * Checks if a square has an anti-air piece.
   *
   * @param square - Square index to check
   * @param color - Color of the anti-air piece
   * @returns True if the square has an anti-air piece of the specified color
   */
  hasAntiAirAt(square: number, color: Color): boolean {
    const bitboard = color === 'r' ? this.antiAirPositions.red : this.antiAirPositions.blue;
    return isSet(bitboard, square);
  }

  /**
   * Checks if a square is in an enemy air defense zone.
   *
   * @param square - Square index to check
   * @param enemyColor - Color of the enemy (who controls the zones)
   * @returns True if the square is in an enemy air defense zone
   */
  isInZone(square: number, enemyColor: Color): boolean {
    const zones = enemyColor === 'r' ? this.zones.red : this.zones.blue;

    // Check if any anti-air piece influences this square
    for (const [_, influencedSquares] of zones) {
      if (influencedSquares.includes(square)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gets all anti-air pieces that influence a specific square.
   *
   * @param square - Square index to check
   * @param enemyColor - Color of the enemy (who controls the zones)
   * @returns Array of anti-air piece squares that influence the target square
   */
  getInfluencingPieces(square: number, enemyColor: Color): number[] {
    const zones = enemyColor === 'r' ? this.zones.red : this.zones.blue;
    const influencingPieces: number[] = [];

    for (const [antiAirSquare, influencedSquares] of zones) {
      if (influencedSquares.includes(square)) {
        influencingPieces.push(antiAirSquare);
      }
    }

    return influencingPieces;
  }

  /**
   * Calculates the influence zone for a single anti-air piece.
   *
   * Uses circular area calculation: all squares within radius where
   * distance² <= radius² are included.
   *
   * @param square - Square index of the anti-air piece (0-131)
   * @param level - Air defense level (1 for anti-air/navy, 2 for missile, +1 if heroic)
   * @returns Array of square indices influenced by this anti-air piece
   */
  calculateZoneForSquare(square: number, level: number): number[] {
    const influencedSquares: number[] = [];

    if (level === 0) {
      return influencedSquares;
    }

    // Convert linear index to rank/file
    const rank = Math.floor(square / 11);
    const file = square % 11;

    // Check all squares in a square area around the piece
    for (let dr = -level; dr <= level; dr++) {
      for (let df = -level; df <= level; df++) {
        const targetRank = rank + dr;
        const targetFile = file + df;

        // Check if target is on board (11x12 board)
        if (targetRank < 0 || targetRank >= 12 || targetFile < 0 || targetFile >= 11) {
          continue;
        }

        // Check if within circular radius (distance² <= level²)
        if (dr * dr + df * df <= level * level) {
          const targetSquare = targetRank * 11 + targetFile;
          influencedSquares.push(targetSquare);
        }
      }
    }

    return influencedSquares;
  }

  /**
   * Calculates air defense zones for a single anti-air piece and adds it to the zones.
   *
   * @param square - Square index of the anti-air piece
   * @param pieceType - Type of the anti-air piece
   * @param isHeroic - Whether the piece is heroic
   * @param color - Color of the anti-air piece
   */
  calculateZoneForPiece(
    square: number,
    pieceType: PieceSymbol,
    isHeroic: boolean,
    color: Color
  ): void {
    const level = getAirDefenseLevel(pieceType, isHeroic);

    if (level === 0) {
      return; // This piece doesn't provide air defense
    }

    // Calculate influenced squares
    const influencedSquares = this.calculateZoneForSquare(square, level);

    // Add to zones map
    const zones = color === 'r' ? this.zones.red : this.zones.blue;
    zones.set(square, influencedSquares);

    // Update anti-air positions bitboard
    if (color === 'r') {
      this.antiAirPositions.red = setBit(this.antiAirPositions.red, square);
    } else {
      this.antiAirPositions.blue = setBit(this.antiAirPositions.blue, square);
    }
  }

  /**
   * Recalculates all air defense zones from scratch.
   *
   * This method should be called with all anti-air pieces on the board.
   * It clears existing zones and rebuilds them.
   *
   * @param antiAirPieces - Array of anti-air pieces with their positions
   */
  calculateAllZones(
    antiAirPieces: Array<{
      square: number;
      pieceType: PieceSymbol;
      isHeroic: boolean;
      color: Color;
    }>
  ): void {
    // Clear existing zones
    this.clear();

    // Calculate zone for each anti-air piece
    for (const piece of antiAirPieces) {
      this.calculateZoneForPiece(piece.square, piece.pieceType, piece.isHeroic, piece.color);
    }
  }

  /**
   * Updates the air defense zone for a piece that has moved.
   *
   * Removes the old zone and calculates a new zone at the new position.
   * This is more efficient than recalculating all zones.
   *
   * @param oldSquare - Previous square of the anti-air piece
   * @param newSquare - New square of the anti-air piece
   * @param pieceType - Type of the anti-air piece
   * @param isHeroic - Whether the piece is heroic
   * @param color - Color of the anti-air piece
   */
  updateZone(
    oldSquare: number,
    newSquare: number,
    pieceType: PieceSymbol,
    isHeroic: boolean,
    color: Color
  ): void {
    // Remove old zone
    this.removeZone(oldSquare, color);

    // Calculate new zone
    this.calculateZoneForPiece(newSquare, pieceType, isHeroic, color);
  }

  /**
   * Removes the air defense zone for a piece (when captured or moved).
   *
   * @param square - Square where the anti-air piece was located
   * @param color - Color of the anti-air piece
   */
  removeZone(square: number, color: Color): void {
    const zones = color === 'r' ? this.zones.red : this.zones.blue;

    // Remove from zones map
    zones.delete(square);

    // Update anti-air positions bitboard
    if (color === 'r') {
      this.antiAirPositions.red = clearBit(this.antiAirPositions.red, square);
    } else {
      this.antiAirPositions.blue = clearBit(this.antiAirPositions.blue, square);
    }
  }

  /**
   * Creates a checker function for air force movement through air defense zones.
   *
   * This function tracks the zones encountered as the air force moves and determines
   * if the movement is allowed based on the following rules:
   * - SAFE_PASS: No zones encountered
   * - KAMIKAZE: Entering a single zone for the first time (suicide attack)
   * - DESTROYED: Multiple zones encountered OR moved out of first zone and back in
   *
   * @param fromSquare - Starting square of the air force piece
   * @param defenseColor - Color of the defending side (enemy)
   * @param offset - Movement offset (direction)
   * @returns Function that checks each square along the path
   */
  getCheckAirDefenseZone(
    fromSquare: number,
    defenseColor: Color,
    offset: number
  ): () => AirDefenseResultType {
    let currentSquare = fromSquare;
    let airDefenseResult: AirDefenseResultType = AirDefenseResult.SAFE_PASS;
    const airDefenseZoneEncountered = new Set<number>();
    let movedOutOfTheFirstADZone = false;

    return () => {
      // If already destroyed, stay destroyed
      if (airDefenseResult === AirDefenseResult.DESTROYED) {
        return airDefenseResult;
      }

      // Move to next square
      currentSquare += offset;

      // Get influencing pieces at this square
      const influencingPieces = this.getInfluencingPieces(currentSquare, defenseColor);

      if (influencingPieces.length > 0) {
        // Add all influencing pieces to encountered set
        for (const piece of influencingPieces) {
          airDefenseZoneEncountered.add(piece);
        }
      } else if (airDefenseZoneEncountered.size > 0) {
        // Not in any zone - check if we moved out of a zone
        movedOutOfTheFirstADZone = true;
      }

      // Determine result based on zones encountered
      if (airDefenseZoneEncountered.size === 0) {
        // No zones encountered - safe
        airDefenseResult = AirDefenseResult.SAFE_PASS;
      } else if (airDefenseZoneEncountered.size === 1 && !movedOutOfTheFirstADZone) {
        // Single zone, haven't left it - kamikaze attack allowed
        airDefenseResult = AirDefenseResult.KAMIKAZE;
      } else {
        // Multiple zones OR left first zone - destroyed
        airDefenseResult = AirDefenseResult.DESTROYED;
      }

      return airDefenseResult;
    };
  }
}
