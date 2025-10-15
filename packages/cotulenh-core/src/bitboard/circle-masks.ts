/**
 * Circle mask generation for air defense zones
 *
 * Pre-computes circular bitboard masks for efficient air defense calculation.
 * Circles are centered at (6,6) for easy sliding to any board position.
 */

import { Bitboard, BitboardUtils, BOARD_STRIDE } from './bitboard-utils'

/**
 * Pre-computed circle masks for different radii
 * These are centered at (6,6) and can be shifted to any position
 */
export class CircleMasks {
  private static masks: Map<number, Bitboard> = new Map()
  private static validBoardMask: Bitboard | null = null

  // Center position for pre-computed circles (6,6) in 16x16 space
  private static readonly CENTER_FILE = 6
  private static readonly CENTER_RANK = 6

  /**
   * Initialize pre-computed circle masks
   * Must be called before using getCircle()
   */
  static initialize(): void {
    // Pre-compute circles for air defense radii 1, 2, 3
    this.masks.set(1, this.generateCircle(1))
    this.masks.set(2, this.generateCircle(2))
    this.masks.set(3, this.generateCircle(3))

    // Pre-compute valid board mask (12x12)
    this.validBoardMask = this.computeValidBoardMask()
  }

  /**
   * Generate a circle mask with given radius
   * Circle is centered at (CENTER_FILE, CENTER_RANK) for sliding
   *
   * @param radius - Radius of the circle (typically 1, 2, or 3)
   * @returns Bitboard with circle mask
   */
  private static generateCircle(radius: number): Bitboard {
    let mask = 0n

    // Iterate through all positions in the circle's bounding box
    for (let df = -radius; df <= radius; df++) {
      for (let dr = -radius; dr <= radius; dr++) {
        // Calculate Euclidean distance from center
        const distance = Math.sqrt(df * df + dr * dr)

        // Include squares within the radius (using <=)
        if (distance <= radius) {
          const file = this.CENTER_FILE + df
          const rank = this.CENTER_RANK + dr

          // Ensure within 16x16 space (will clip to 12x12 when used)
          if (
            file >= 0 &&
            file < BOARD_STRIDE &&
            rank >= 0 &&
            rank < BOARD_STRIDE
          ) {
            mask |= BitboardUtils.singleBit(file, rank)
          }
        }
      }
    }

    return mask
  }

  /**
   * Get a pre-computed circle mask
   *
   * @param radius - Radius (1, 2, or 3)
   * @returns Pre-computed circle bitboard, or empty if not initialized
   */
  static getCircle(radius: number): Bitboard {
    const mask = this.masks.get(radius)
    if (mask === undefined) {
      console.warn(
        `Circle mask for radius ${radius} not initialized. Call CircleMasks.initialize() first.`,
      )
      return 0n
    }
    return mask
  }

  /**
   * Slide a circle mask to a specific board position
   *
   * @param circleMask - Pre-computed circle mask (centered at 6,6)
   * @param targetFile - Target file (0-11)
   * @param targetRank - Target rank (0-11)
   * @returns Circle mask positioned at target, clipped to valid board
   */
  static slideCircleToPosition(
    circleMask: Bitboard,
    targetFile: number,
    targetRank: number,
  ): Bitboard {
    // Calculate offset from center
    const fileOffset = targetFile - this.CENTER_FILE
    const rankOffset = targetRank - this.CENTER_RANK

    // Calculate total bit shift
    // Each rank is BOARD_STRIDE bits apart
    const totalShift = rankOffset * BOARD_STRIDE + fileOffset

    // Shift the circle
    let result: Bitboard
    if (totalShift >= 0) {
      result = circleMask << BigInt(totalShift)
    } else {
      result = circleMask >> BigInt(-totalShift)
    }

    // Clip to valid 12x12 board
    if (this.validBoardMask === null) {
      console.warn(
        'Valid board mask not initialized. Call CircleMasks.initialize() first.',
      )
      return result
    }

    return result & this.validBoardMask
  }

  /**
   * Compute the valid board mask (12x12 in 16x16 space)
   *
   * @returns Bitboard with all valid board squares set
   */
  private static computeValidBoardMask(): Bitboard {
    let mask = 0n

    for (let rank = 0; rank < 12; rank++) {
      for (let file = 0; file < 12; file++) {
        mask |= BitboardUtils.singleBit(file, rank)
      }
    }

    return mask
  }

  /**
   * Get the valid board mask (12x12)
   *
   * @returns Bitboard with all valid board squares set
   */
  static getValidBoardMask(): Bitboard {
    if (this.validBoardMask === null) {
      console.warn(
        'Valid board mask not initialized. Call CircleMasks.initialize() first.',
      )
      return 0n
    }
    return this.validBoardMask
  }

  /**
   * Check if CircleMasks has been initialized
   *
   * @returns true if initialized, false otherwise
   */
  static isInitialized(): boolean {
    return this.masks.size > 0 && this.validBoardMask !== null
  }

  /**
   * Get all available radii
   *
   * @returns Array of available radii
   */
  static getAvailableRadii(): number[] {
    return Array.from(this.masks.keys()).sort((a, b) => a - b)
  }
}

// Auto-initialize on module load
CircleMasks.initialize()
