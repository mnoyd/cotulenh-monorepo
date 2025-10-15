/**
 * Bitboard utilities for CoTuLenh hybrid architecture
 *
 * Uses bigint to represent a 12x12 board in a 16x16 space (256 bits).
 * This allows efficient operations on air defense zones and other bitboard-based features.
 */

/**
 * Bitboard type - represents the game board as a 256-bit integer
 * Each bit represents a square in the 16x16 space (only 12x12 are valid)
 */
export type Bitboard = bigint

/**
 * Constants
 */
export const EMPTY_BITBOARD: Bitboard = 0n
export const BOARD_STRIDE = 16 // 16 bits per rank (12 used + 4 padding)
export const BOARD_WIDTH = 12
export const BOARD_HEIGHT = 12

/**
 * Bitboard utility functions
 */
export class BitboardUtils {
  /**
   * Convert file and rank to bit position
   * @param file - File (0-11, where 0 = 'a', 11 = 'l')
   * @param rank - Rank (0-11)
   * @returns Bit position (0-255)
   */
  static squareToBit(file: number, rank: number): number {
    return rank * BOARD_STRIDE + file
  }

  /**
   * Convert bit position back to file and rank
   * @param bit - Bit position (0-255)
   * @returns [file, rank] tuple
   */
  static bitToSquare(bit: number): [file: number, rank: number] {
    const file = bit % BOARD_STRIDE
    const rank = Math.floor(bit / BOARD_STRIDE)
    return [file, rank]
  }

  /**
   * Create a bitboard with a single bit set
   * @param file - File (0-11)
   * @param rank - Rank (0-11)
   * @returns Bitboard with only that square set
   */
  static singleBit(file: number, rank: number): Bitboard {
    return 1n << BigInt(this.squareToBit(file, rank))
  }

  /**
   * Check if a specific bit is set in a bitboard
   * @param bb - Bitboard to check
   * @param file - File (0-11)
   * @param rank - Rank (0-11)
   * @returns true if the bit is set
   */
  static isSet(bb: Bitboard, file: number, rank: number): boolean {
    return (bb & this.singleBit(file, rank)) !== 0n
  }

  /**
   * Set a bit in a bitboard
   * @param bb - Bitboard to modify
   * @param file - File (0-11)
   * @param rank - Rank (0-11)
   * @returns New bitboard with bit set
   */
  static setBit(bb: Bitboard, file: number, rank: number): Bitboard {
    return bb | this.singleBit(file, rank)
  }

  /**
   * Clear a bit in a bitboard
   * @param bb - Bitboard to modify
   * @param file - File (0-11)
   * @param rank - Rank (0-11)
   * @returns New bitboard with bit cleared
   */
  static clearBit(bb: Bitboard, file: number, rank: number): Bitboard {
    return bb & ~this.singleBit(file, rank)
  }

  /**
   * Count the number of set bits in a bitboard (population count)
   * @param bb - Bitboard to count
   * @returns Number of set bits
   */
  static popCount(bb: Bitboard): number {
    let count = 0
    let temp = bb
    while (temp !== 0n) {
      count++
      temp &= temp - 1n // Clear lowest set bit
    }
    return count
  }

  /**
   * Get the position of the lowest set bit
   * @param bb - Bitboard to check
   * @returns Bit position of lowest set bit, or -1 if empty
   */
  static getLowestSetBit(bb: Bitboard): number {
    if (bb === 0n) return -1

    let count = 0
    let temp = bb
    while ((temp & 1n) === 0n) {
      temp >>= 1n
      count++
    }
    return count
  }

  /**
   * Get all bit positions that are set
   * @param bb - Bitboard to check
   * @returns Array of bit positions
   */
  static getBitPositions(bb: Bitboard): number[] {
    const positions: number[] = []
    let temp = bb

    while (temp !== 0n) {
      const pos = this.getLowestSetBit(temp)
      positions.push(pos)
      temp &= temp - 1n // Clear lowest set bit
    }

    return positions
  }

  /**
   * Print a bitboard for debugging
   * Displays the board with rank labels and file labels
   * @param bb - Bitboard to print
   * @param label - Optional label for the output
   */
  static printBitboard(bb: Bitboard, label = ''): void {
    if (label) {
      console.log(`\n${label}:`)
    }

    console.log('   a b c d e f g h i j k l')

    for (let rank = 11; rank >= 0; rank--) {
      let line = `${rank.toString().padStart(2)}: `

      for (let file = 0; file < 12; file++) {
        const isSet = this.isSet(bb, file, rank)
        line += isSet ? '● ' : '. '
      }

      console.log(line)
    }

    console.log(`\nPopulation: ${this.popCount(bb)} bits`)
  }
}
