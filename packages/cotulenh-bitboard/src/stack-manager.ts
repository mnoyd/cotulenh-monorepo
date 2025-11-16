/**
 * Stack Manager for handling complex stack mechanics in CoTuLenh.
 *
 * Stacks allow multiple pieces to occupy the same square (carrier + carried pieces).
 * This module provides a hybrid approach: bitboards track which squares have stacks,
 * while a Map stores detailed stack composition.
 */

import type { Bitboard } from './bitboard';
import { EMPTY, setBit, clearBit, isSet } from './bitboard';
import type { Piece, PieceSymbol } from './types';
import { PieceStacker, ROLE_FLAGS } from '@repo/cotulenh-combine-piece';

/**
 * Represents a stack of pieces at a specific square.
 *
 * A stack consists of:
 * - carrier: The piece that carries other pieces (visible on the board)
 * - carried: Array of pieces being carried (hidden until deployed)
 * - square: The square index where the stack is located
 */
export interface StackData {
  square: number;
  carrier: Piece;
  carried: Piece[];
}

/**
 * Symbol to flag mapping for piece validation.
 */
const SYMBOL_TO_FLAG: Record<PieceSymbol, number> = {
  c: ROLE_FLAGS.COMMANDER,
  i: ROLE_FLAGS.INFANTRY,
  t: ROLE_FLAGS.TANK,
  m: ROLE_FLAGS.MILITIA,
  e: ROLE_FLAGS.ENGINEER,
  a: ROLE_FLAGS.ARTILLERY,
  g: ROLE_FLAGS.ANTI_AIR,
  s: ROLE_FLAGS.MISSILE,
  f: ROLE_FLAGS.AIR_FORCE,
  n: ROLE_FLAGS.NAVY,
  h: ROLE_FLAGS.HEADQUARTER
};

/**
 * StackManager handles all stack-related operations.
 *
 * Uses a hybrid approach:
 * - carrierBitboard: Fast bitboard to check which squares have stacks
 * - stacks: Map storing detailed composition for each stack
 *
 * This allows fast queries (bitboard) with detailed information when needed (Map).
 */
export class StackManager {
  /**
   * Bitboard marking which squares contain stacks.
   * Used for fast stack detection without consulting the Map.
   */
  carrierBitboard: Bitboard = { ...EMPTY };

  /**
   * Map storing detailed stack data for each stack square.
   * Key: square index (0-131)
   * Value: StackData with carrier and carried pieces
   */
  private stacks: Map<number, StackData> = new Map();

  /**
   * PieceStacker instance for validating stack compositions.
   */
  private stacker: PieceStacker<Piece>;

  /**
   * Creates a new StackManager with no stacks.
   */
  constructor() {
    // Initialize with empty state
    // Create PieceStacker with direct flag mapping
    this.stacker = new PieceStacker<Piece>((piece) => SYMBOL_TO_FLAG[piece.type] || 0);
  }

  /**
   * Clears all stacks and resets the manager to empty state.
   */
  clear(): void {
    this.carrierBitboard = { ...EMPTY };
    this.stacks.clear();
  }

  /**
   * Checks if a square contains a stack.
   *
   * @param square - Square index (0-131) to check
   * @returns True if the square has a stack, false otherwise
   */
  hasStack(square: number): boolean {
    return isSet(this.carrierBitboard, square);
  }

  /**
   * Gets the stack data for a specific square.
   *
   * @param square - Square index (0-131) to query
   * @returns StackData if a stack exists at the square, undefined otherwise
   */
  getStack(square: number): StackData | undefined {
    return this.stacks.get(square);
  }

  /**
   * Gets all stacks currently managed.
   *
   * @returns Array of all StackData objects
   */
  getAllStacks(): StackData[] {
    return Array.from(this.stacks.values());
  }

  /**
   * Gets the number of stacks currently managed.
   *
   * @returns Number of stacks
   */
  getStackCount(): number {
    return this.stacks.size;
  }

  /**
   * Creates a new stack at the specified square.
   *
   * The carrier piece is the visible piece on the board.
   * The carried pieces are hidden and move with the carrier.
   *
   * @param carrier - The piece that carries other pieces
   * @param carried - Array of pieces being carried
   * @param square - Square index (0-131) where to create the stack
   * @throws Error if a stack already exists at the square
   */
  createStack(carrier: Piece, carried: Piece[], square: number): void {
    if (this.hasStack(square)) {
      throw new Error(`Stack already exists at square ${square}`);
    }

    // Create the stack data
    const stackData: StackData = {
      square,
      carrier,
      carried: [...carried] // Copy array to avoid external mutations
    };

    // Store in map
    this.stacks.set(square, stackData);

    // Update carrier bitboard
    this.carrierBitboard = setBit(this.carrierBitboard, square);
  }

  /**
   * Adds a piece to an existing stack.
   *
   * The piece is added to the carried array of the stack.
   *
   * @param piece - Piece to add to the stack
   * @param square - Square index (0-131) where the stack is located
   * @throws Error if no stack exists at the square
   */
  addToStack(piece: Piece, square: number): void {
    const stack = this.stacks.get(square);
    if (!stack) {
      throw new Error(`No stack exists at square ${square}`);
    }

    // Add piece to carried array
    stack.carried.push({ ...piece }); // Copy piece to avoid external mutations
  }

  /**
   * Removes a specific piece type from a stack.
   *
   * Removes the first occurrence of the specified piece type from the carried array.
   * If the carried array becomes empty after removal, the stack is not destroyed
   * (it still has the carrier).
   *
   * @param pieceType - Type of piece to remove
   * @param square - Square index (0-131) where the stack is located
   * @returns The removed piece, or undefined if not found
   * @throws Error if no stack exists at the square
   */
  removeFromStack(pieceType: PieceSymbol, square: number): Piece | undefined {
    const stack = this.stacks.get(square);
    if (!stack) {
      throw new Error(`No stack exists at square ${square}`);
    }

    // Find and remove the first piece of the specified type
    const index = stack.carried.findIndex((p) => p.type === pieceType);
    if (index === -1) {
      return undefined;
    }

    const [removed] = stack.carried.splice(index, 1);
    return removed;
  }

  /**
   * Destroys a stack completely, removing it from the manager.
   *
   * @param square - Square index (0-131) where the stack is located
   * @returns The destroyed stack data, or undefined if no stack existed
   */
  destroyStack(square: number): StackData | undefined {
    const stack = this.stacks.get(square);
    if (!stack) {
      return undefined;
    }

    // Remove from map
    this.stacks.delete(square);

    // Clear carrier bitboard
    this.carrierBitboard = clearBit(this.carrierBitboard, square);

    return stack;
  }

  /**
   * Validates if a stack composition is legal.
   *
   * Uses the PieceStacker to check if the carrier and carried pieces
   * can form a valid stack according to game rules.
   *
   * Rules enforced:
   * - Piece type compatibility (certain pieces can't carry others)
   * - Stack size limits (maximum pieces in a stack)
   * - All pieces must be the same color
   * - Heroic status is preserved for individual pieces
   *
   * @param carrier - The carrier piece
   * @param carried - Array of carried pieces
   * @returns True if the stack composition is valid, false otherwise
   */
  validateStackComposition(carrier: Piece, carried: Piece[]): boolean {
    // Empty carried array is always valid (single piece, no stack)
    if (carried.length === 0) {
      return true;
    }

    // Check that all pieces are the same color
    const allPieces = [carrier, ...carried];
    const firstColor = carrier.color;
    if (!allPieces.every((p) => p.color === firstColor)) {
      return false;
    }

    // Check stack size limit (carrier + carried should not exceed 4 pieces total)
    if (allPieces.length > 4) {
      return false;
    }

    // Use PieceStacker to validate the combination
    // If combine returns null, the combination is invalid
    const combined = this.stacker.combine(allPieces);
    return combined !== null;
  }

  /**
   * Validates if adding a piece to an existing stack would be legal.
   *
   * @param piece - Piece to add
   * @param square - Square where the stack is located
   * @returns True if adding the piece would be valid, false otherwise
   */
  validateAddToStack(piece: Piece, square: number): boolean {
    const stack = this.stacks.get(square);
    if (!stack) {
      return false;
    }

    // Check color compatibility
    if (piece.color !== stack.carrier.color) {
      return false;
    }

    // Check if the new composition would be valid
    const newCarried = [...stack.carried, piece];
    return this.validateStackComposition(stack.carrier, newCarried);
  }
}
