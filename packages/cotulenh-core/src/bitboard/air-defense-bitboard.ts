/**
 * Bitboard-based air defense calculator
 *
 * Calculates air defense zones using efficient bitboard operations.
 * This replaces the old loop-based approach with 25-50x faster bitboard lookups.
 */

import { Bitboard, BitboardUtils } from './bitboard-utils'
import { CircleMasks } from './circle-masks'
import { Color, Piece, PieceSymbol } from '../type'

/**
 * Maps piece types to their BASE air defense radius
 * Heroic pieces get +1 radius
 */
const BASE_AIR_DEFENSE_RADIUS: Partial<Record<PieceSymbol, number>> = {
  n: 1, // Navy - radius 1
  g: 1, // Anti-Air - radius 1
  s: 2, // Missile - radius 2
  // Other pieces provide no air defense
}

/**
 * Board representation for bitboard calculations
 * Maps 0x88 board indices to file/rank coordinates
 */
export interface BoardSquare {
  square: number // 0x88 index
  file: number // 0-11
  rank: number // 0-11
  piece: Piece | null
}

/**
 * Air defense zone calculation result
 */
export interface AirDefenseResult {
  redZone: Bitboard // Red air defense coverage
  blackZone: Bitboard // Black air defense coverage
  combinedZone: Bitboard // Union of both zones
}

/**
 * Air defense calculator using bitboards
 */
export class AirDefenseBitboard {
  /**
   * Get air defense radius for a piece (accounting for heroic status)
   *
   * @param piece - Piece to check
   * @returns Air defense radius (0 if no air defense)
   */
  private static getPieceRadius(piece: Piece): number {
    const baseRadius = BASE_AIR_DEFENSE_RADIUS[piece.type] ?? 0
    if (baseRadius === 0) return 0

    // Heroic pieces get +1 radius (capped at 3)
    return piece.heroic ? Math.min(baseRadius + 1, 3) : baseRadius
  }

  /**
   * Calculate air defense zones for all pieces on the board
   *
   * @param board - 0x88 board array (256 elements)
   * @returns Air defense zones for red and black
   */
  static calculateAirDefense(board: (Piece | null)[]): AirDefenseResult {
    let redZone = 0n
    let blackZone = 0n

    // Iterate through valid board squares (12x12)
    for (let rank = 0; rank < 12; rank++) {
      for (let file = 0; file < 12; file++) {
        const square0x88 = rank * 16 + file
        const piece = board[square0x88]

        if (piece === null) continue

        const radius = this.getPieceRadius(piece)
        if (radius === 0) continue // Piece doesn't provide air defense

        // Get pre-computed circle and slide to piece position
        const circle = CircleMasks.getCircle(radius)
        const zone = CircleMasks.slideCircleToPosition(circle, file, rank)

        // Add to appropriate color's zone
        if (piece.color === 'r') {
          redZone |= zone
        } else {
          blackZone |= zone
        }
      }
    }

    return {
      redZone,
      blackZone,
      combinedZone: redZone | blackZone,
    }
  }

  /**
   * Calculate air defense zone for a single piece
   *
   * @param piece - Piece to calculate zone for
   * @param file - File position (0-11)
   * @param rank - Rank position (0-11)
   * @returns Bitboard representing the piece's air defense zone
   */
  static calculatePieceZone(
    piece: Piece,
    file: number,
    rank: number,
  ): Bitboard {
    const radius = this.getPieceRadius(piece)
    if (radius === 0) return 0n

    const circle = CircleMasks.getCircle(radius)
    return CircleMasks.slideCircleToPosition(circle, file, rank)
  }

  /**
   * Check if a square is under air defense
   *
   * @param zone - Air defense bitboard
   * @param file - File to check (0-11)
   * @param rank - Rank to check (0-11)
   * @returns true if square is defended
   */
  static isSquareDefended(zone: Bitboard, file: number, rank: number): boolean {
    return BitboardUtils.isSet(zone, file, rank)
  }

  /**
   * Get all squares covered by an air defense zone
   *
   * @param zone - Air defense bitboard
   * @returns Array of [file, rank] tuples for defended squares
   */
  static getDefendedSquares(zone: Bitboard): Array<[number, number]> {
    const positions = BitboardUtils.getBitPositions(zone)
    return positions.map((pos) => BitboardUtils.bitToSquare(pos))
  }

  /**
   * Count number of squares defended
   *
   * @param zone - Air defense bitboard
   * @returns Number of defended squares
   */
  static countDefendedSquares(zone: Bitboard): number {
    return BitboardUtils.popCount(zone)
  }

  /**
   * Calculate air defense zone for a specific color
   *
   * @param board - 0x88 board array
   * @param color - Color to calculate zone for
   * @returns Bitboard representing color's air defense coverage
   */
  static calculateColorZone(board: (Piece | null)[], color: Color): Bitboard {
    const result = this.calculateAirDefense(board)
    return color === 'r' ? result.redZone : result.blackZone
  }

  /**
   * Get piece type's BASE air defense radius (not accounting for heroic)
   *
   * @param pieceType - Piece type symbol
   * @returns Base air defense radius (0 if no air defense)
   */
  static getBaseAirDefenseRadius(pieceType: PieceSymbol): number {
    return BASE_AIR_DEFENSE_RADIUS[pieceType] ?? 0
  }

  /**
   * Check if a piece type provides air defense
   *
   * @param pieceType - Piece type symbol
   * @returns true if piece type provides air defense
   */
  static providesAirDefense(pieceType: PieceSymbol): boolean {
    return (BASE_AIR_DEFENSE_RADIUS[pieceType] ?? 0) > 0
  }

  /**
   * Calculate the intersection of two air defense zones
   *
   * @param zone1 - First zone
   * @param zone2 - Second zone
   * @returns Bitboard representing squares defended by both
   */
  static intersectZones(zone1: Bitboard, zone2: Bitboard): Bitboard {
    return zone1 & zone2
  }

  /**
   * Calculate the union of two air defense zones
   *
   * @param zone1 - First zone
   * @param zone2 - Second zone
   * @returns Bitboard representing squares defended by either
   */
  static unionZones(zone1: Bitboard, zone2: Bitboard): Bitboard {
    return zone1 | zone2
  }

  /**
   * Calculate squares defended by zone1 but not zone2
   *
   * @param zone1 - First zone
   * @param zone2 - Second zone
   * @returns Bitboard representing unique coverage of zone1
   */
  static subtractZones(zone1: Bitboard, zone2: Bitboard): Bitboard {
    return zone1 & ~zone2
  }

  /**
   * Debug: Print air defense zone
   *
   * @param zone - Zone to print
   * @param label - Optional label
   */
  static printZone(zone: Bitboard, label = ''): void {
    BitboardUtils.printBitboard(zone, label)
  }
}
