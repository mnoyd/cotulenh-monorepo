/**
 * Bitboard implementation for CoTuLenh chess engine.
 *
 * Uses 128-bit bitboards (two 64-bit integers) to represent the 11x12 board (132 squares).
 * Each bit represents a square on the board, enabling fast bitwise operations.
 */

/**
 * Represents a 128-bit bitboard using two 64-bit integers.
 * - low: bits 0-63 (squares 0-63)
 * - high: bits 64-127 (squares 64-127)
 *
 * The 11x12 board has 132 squares, so we use bits 0-131.
 */
export interface Bitboard {
  low: bigint;
  high: bigint;
}

/**
 * Empty bitboard with all bits set to 0.
 */
export const EMPTY: Bitboard = {
  low: 0n,
  high: 0n
};

/**
 * Full bitboard with all bits set to 1.
 * For 132 squares, we need bits 0-131 set.
 * - low: all 64 bits set (0xFFFFFFFFFFFFFFFF)
 * - high: bits 0-67 set (0xFFFFFFFFFFFFFFF for 68 bits, but we only use 68 bits total)
 */
export const FULL: Bitboard = {
  low: 0xffffffffffffffffn,
  high: 0xffffffffffffffffn
};

/**
 * Type for bitboard operations that take two bitboards and return one.
 */
export type BitboardBinaryOp = (a: Bitboard, b: Bitboard) => Bitboard;

/**
 * Type for bitboard operations that take one bitboard and return one.
 */
export type BitboardUnaryOp = (a: Bitboard) => Bitboard;

/**
 * Type for bitboard query operations that check a specific square.
 */
export type BitboardSquareQuery = (bb: Bitboard, square: number) => boolean;

/**
 * Type for bitboard modification operations that set/clear a specific square.
 */
export type BitboardSquareModify = (bb: Bitboard, square: number) => Bitboard;

/**
 * Performs bitwise AND operation on two bitboards.
 * Returns a new bitboard with bits set only where both input bitboards have bits set.
 *
 * @param a - First bitboard
 * @param b - Second bitboard
 * @returns Result of a AND b
 */
export function and(a: Bitboard, b: Bitboard): Bitboard {
  return {
    low: a.low & b.low,
    high: a.high & b.high
  };
}

/**
 * Performs bitwise OR operation on two bitboards.
 * Returns a new bitboard with bits set where either input bitboard has bits set.
 *
 * @param a - First bitboard
 * @param b - Second bitboard
 * @returns Result of a OR b
 */
export function or(a: Bitboard, b: Bitboard): Bitboard {
  return {
    low: a.low | b.low,
    high: a.high | b.high
  };
}

/**
 * Performs bitwise XOR operation on two bitboards.
 * Returns a new bitboard with bits set where exactly one input bitboard has bits set.
 *
 * @param a - First bitboard
 * @param b - Second bitboard
 * @returns Result of a XOR b
 */
export function xor(a: Bitboard, b: Bitboard): Bitboard {
  return {
    low: a.low ^ b.low,
    high: a.high ^ b.high
  };
}

/**
 * Performs bitwise NOT operation on a bitboard.
 * Returns a new bitboard with all bits flipped.
 *
 * @param a - Input bitboard
 * @returns Result of NOT a
 */
export function not(a: Bitboard): Bitboard {
  return {
    low: ~a.low,
    high: ~a.high
  };
}

/**
 * Checks if a specific bit is set in the bitboard.
 *
 * @param bb - Bitboard to check
 * @param square - Square index (0-131)
 * @returns True if the bit at the square is set, false otherwise
 */
export function isSet(bb: Bitboard, square: number): boolean {
  if (square < 0 || square >= 132) {
    return false;
  }

  if (square < 64) {
    return (bb.low & (1n << BigInt(square))) !== 0n;
  } else {
    return (bb.high & (1n << BigInt(square - 64))) !== 0n;
  }
}

/**
 * Sets a specific bit in the bitboard.
 * Returns a new bitboard with the bit set.
 *
 * @param bb - Bitboard to modify
 * @param square - Square index (0-131)
 * @returns New bitboard with the bit set
 */
export function setBit(bb: Bitboard, square: number): Bitboard {
  if (square < 0 || square >= 132) {
    return bb;
  }

  if (square < 64) {
    return {
      low: bb.low | (1n << BigInt(square)),
      high: bb.high
    };
  } else {
    return {
      low: bb.low,
      high: bb.high | (1n << BigInt(square - 64))
    };
  }
}

/**
 * Clears a specific bit in the bitboard.
 * Returns a new bitboard with the bit cleared.
 *
 * @param bb - Bitboard to modify
 * @param square - Square index (0-131)
 * @returns New bitboard with the bit cleared
 */
export function clearBit(bb: Bitboard, square: number): Bitboard {
  if (square < 0 || square >= 132) {
    return bb;
  }

  if (square < 64) {
    return {
      low: bb.low & ~(1n << BigInt(square)),
      high: bb.high
    };
  } else {
    return {
      low: bb.low,
      high: bb.high & ~(1n << BigInt(square - 64))
    };
  }
}

/**
 * Counts the number of set bits in a bigint using Brian Kernighan's algorithm.
 *
 * @param n - BigInt to count bits in
 * @returns Number of set bits
 */
function countBits(n: bigint): number {
  let count = 0;
  while (n !== 0n) {
    n &= n - 1n;
    count++;
  }
  return count;
}

/**
 * Counts the number of set bits in the bitboard (population count).
 *
 * @param bb - Bitboard to count
 * @returns Number of set bits
 */
export function popCount(bb: Bitboard): number {
  return countBits(bb.low) + countBits(bb.high);
}

/**
 * Finds the index of the least significant bit (LSB) in the bitboard.
 * Returns -1 if the bitboard is empty.
 *
 * @param bb - Bitboard to search
 * @returns Index of the LSB (0-131), or -1 if empty
 */
export function lsb(bb: Bitboard): number {
  if (bb.low !== 0n) {
    // Find LSB in low part
    let bit = 0;
    let n = bb.low;
    while ((n & 1n) === 0n && bit < 64) {
      n >>= 1n;
      bit++;
    }
    return bit;
  } else if (bb.high !== 0n) {
    // Find LSB in high part
    let bit = 0;
    let n = bb.high;
    while ((n & 1n) === 0n && bit < 64) {
      n >>= 1n;
      bit++;
    }
    return bit + 64;
  }
  return -1;
}

/**
 * Finds the index of the most significant bit (MSB) in the bitboard.
 * Returns -1 if the bitboard is empty.
 *
 * @param bb - Bitboard to search
 * @returns Index of the MSB (0-131), or -1 if empty
 */
export function msb(bb: Bitboard): number {
  if (bb.high !== 0n) {
    // Find MSB in high part
    let bit = 63;
    let n = bb.high;
    while (bit >= 0 && (n & (1n << BigInt(bit))) === 0n) {
      bit--;
    }
    return bit >= 0 ? bit + 64 : -1;
  } else if (bb.low !== 0n) {
    // Find MSB in low part
    let bit = 63;
    let n = bb.low;
    while (bit >= 0 && (n & (1n << BigInt(bit))) === 0n) {
      bit--;
    }
    return bit;
  }
  return -1;
}

/**
 * Converts a 0x88 square index to a linear bitboard index (0-131).
 *
 * The 0x88 board uses a 16x16 representation where:
 * - Rank 12: 0x00-0x0A (a12-k12)
 * - Rank 11: 0x10-0x1A (a11-k11)
 * - ...
 * - Rank 1: 0xB0-0xBA (a1-k1)
 *
 * We convert this to a linear 0-131 index for the bitboard:
 * - Rank 12: 0-10
 * - Rank 11: 11-21
 * - ...
 * - Rank 1: 121-131
 *
 * @param square - 0x88 square index
 * @returns Linear bitboard index (0-131), or -1 if invalid
 */
export function squareToBit(square: number): number {
  // Extract file (0-10) and rank (0-11) from 0x88 representation
  const file = square & 0x0f;
  const rank = square >> 4;

  // Validate: file must be 0-10, rank must be 0-11
  if (file < 0 || file > 10 || rank < 0 || rank > 11) {
    return -1;
  }

  // Convert to linear index: rank * 11 + file
  return rank * 11 + file;
}

/**
 * Converts a linear bitboard index (0-131) to a 0x88 square index.
 *
 * @param bit - Linear bitboard index (0-131)
 * @returns 0x88 square index, or -1 if invalid
 */
export function bitToSquare(bit: number): number {
  // Validate: bit must be 0-131
  if (bit < 0 || bit >= 132) {
    return -1;
  }

  // Extract rank and file from linear index
  const rank = Math.floor(bit / 11);
  const file = bit % 11;

  // Convert to 0x88: (rank << 4) | file
  return (rank << 4) | file;
}

/**
 * Validates if a 0x88 square index is on the board.
 *
 * @param square - 0x88 square index
 * @returns True if the square is valid, false otherwise
 */
export function isValidSquare(square: number): boolean {
  const file = square & 0x0f;
  const rank = square >> 4;
  return file >= 0 && file <= 10 && rank >= 0 && rank <= 11;
}

/**
 * Validates if a bitboard index is valid.
 *
 * @param bit - Bitboard index
 * @returns True if the bit index is valid (0-131), false otherwise
 */
export function isValidBit(bit: number): boolean {
  return bit >= 0 && bit < 132;
}
