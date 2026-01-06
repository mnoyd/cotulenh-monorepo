/**
 * Pure number-based stack core implementation
 * Works with role flags as numbers, no objects or external dependencies
 */

/** Role bit flags - used for bitwise operations and state encoding */
export const ROLE_FLAGS = {
  COMMANDER: 1,
  INFANTRY: 2,
  MILITIA: 4,
  ARTILLERY: 8,
  ANTI_AIR: 16,
  MISSILE: 32,
  TANK: 64,
  AIR_FORCE: 128,
  ENGINEER: 256,
  NAVY: 512,
  HEADQUARTER: 1024
} as const;

/** Type for user-defined role names mapped to internal ROLE_FLAGS keys */
export type RoleMapping = Record<string, keyof typeof ROLE_FLAGS>;

/** Default 1:1 mapping from role names to ROLE_FLAGS - can be overridden for custom games */
export const DEFAULT_ROLE_MAPPING: RoleMapping = Object.fromEntries(
  Object.keys(ROLE_FLAGS).map((role) => [role, role])
) as RoleMapping;

/**
 * Creates a role mapper function that converts user-defined roles to internal ROLE_FLAGS
 * @param roleMapping - Mapping from user role names to internal ROLE_FLAGS keys
 * @returns Function that takes a user role and returns the corresponding ROLE_FLAG value
 */
export function createRoleMapper(roleMapping: RoleMapping = DEFAULT_ROLE_MAPPING) {
  return (userRole: string): number => {
    // Try exact match first, then uppercase
    const internalRole = roleMapping[userRole] || roleMapping[userRole.toUpperCase()];
    return internalRole ? ROLE_FLAGS[internalRole] : 0;
  };
}

import { PREDEFINED_STACKS } from './predefined-stacks.js';

/** Maximum pieces that can be combined (carrier + 3 slots) */
const MAX_STACK_SIZE = 4;

/**
 * Core stack engine - performs O(1) lookups on pre-calculated valid combinations
 * @internal Used by PieceStacker; not meant for direct use
 */
class StackEngine {
  private readonly stackMap: Map<number, bigint>;

  constructor() {
    this.stackMap = new Map(PREDEFINED_STACKS);
  }

  /**
   * Look up a valid stack combination by piece roles
   * @param pieces Array of role flags to combine
   * @returns Stack state if valid, null otherwise
   */
  lookup(pieces: number[]): bigint | null {
    if (!pieces.length || pieces.length > MAX_STACK_SIZE) return null;
    if (new Set(pieces).size !== pieces.length) return null; // No duplicates

    const mask = pieces.reduce((m, p) => m | p, 0);
    return this.stackMap.get(mask) ?? null;
  }
}

/** Global singleton - initialized once, reused for all operations */
const stackEngine = new StackEngine();

export { StackEngine };

/**
 * Generic piece stacker for any piece type (T)
 * Handles combining pieces into stacks and removing pieces from stacks
 * @typeParam T - The piece type (e.g., { role: string; color: string; carrying?: T[] })
 */
export class PieceStacker<T> {
  private readonly getRoleFlag: (piece: T) => number;

  /**
   * Create a PieceStacker
   * @param getRoleFlag - Function to extract role flag from a piece, OR a role extractor if roleMapping provided
   * @param roleMapping - Optional custom mapping from role strings to ROLE_FLAGS. If provided, getRoleFlag treats input as role string extractor
   */
  constructor(getRoleFlag: (piece: T) => number, roleMapping?: never);
  constructor(roleExtractor: (piece: T) => string, roleMapping: RoleMapping);
  constructor(
    getRoleFlagOrRoleExtractor: ((piece: T) => number) | ((piece: T) => string),
    roleMapping?: RoleMapping
  ) {
    if (roleMapping) {
      const roleExtractor = getRoleFlagOrRoleExtractor as (piece: T) => string;
      const roleMapper = createRoleMapper(roleMapping);
      this.getRoleFlag = (piece: T) => roleMapper(roleExtractor(piece));
    } else {
      this.getRoleFlag = getRoleFlagOrRoleExtractor as (piece: T) => number;
    }
  }

  /**
   * Factory method for creating a PieceStacker with role string mapping
   * Alias for `new PieceStacker(roleExtractor, roleMapping)`
   * @param roleExtractor Function to extract role string from piece
   * @param roleMapping Mapping from user role names to internal ROLE_FLAGS keys
   */
  static withRoleMapping<T>(
    roleExtractor: (piece: T) => string,
    roleMapping: RoleMapping
  ): PieceStacker<T> {
    return new PieceStacker(roleExtractor, roleMapping);
  }

  /**
   * Combine array of pieces into one stack
   * NOTE: Assumes all pieces are same color - no color checking here
   */
  combine(pieces: T[]): T | null {
    if (!pieces.length) return null;

    // Flatten all pieces and get role numbers
    const flatPieces = this.flattenPieces(pieces);
    const roleNumbers = flatPieces.map(this.getRoleFlag);

    // Call CORE ENGINE - THE ONLY METHOD
    const stackState = stackEngine.lookup(roleNumbers);
    if (!stackState) return null;

    // Convert core stack to piece format
    return this.makePieceFromCoreStack(stackState, flatPieces);
  }

  /**
   * Remove piece from stack using fast bitwise operations
   * Performance optimizations:
   * 1. Fast path for single pieces (O(1))
   * 2. Bitwise operations on stack state instead of array manipulation
   * 3. Direct stack state lookup instead of full recombination
   * 4. Single flatten pass instead of multiple
   *
   * When carrier is removed, automatically promotes first remaining piece to carrier
   */
  remove(stackPiece: T, pieceToRemove: T): T | null {
    // Build Set of roles to remove (O(1) lookup)
    const flatPiecesToRemove = this.flattenPieces([pieceToRemove]);
    const rolesToRemove = new Set(flatPiecesToRemove.map((p) => this.getRoleFlag(p)));

    // Fast path: if removing from a single piece, just check if it matches any role to remove
    const stackPieceRole = this.getRoleFlag(stackPiece);
    const carrying = (stackPiece as unknown as { carrying?: T[] }).carrying;

    if (!carrying || carrying.length === 0) {
      // Single piece - return null if it matches any role to remove, otherwise return unchanged
      return rolesToRemove.has(stackPieceRole) ? null : stackPiece;
    }

    // Multi-piece stack: get all pieces and filter out removed ones (single flatten pass)
    const flatPieces = this.flattenPieces([stackPiece]);
    const remainingPieces = flatPieces.filter((p) => !rolesToRemove.has(this.getRoleFlag(p)));

    if (remainingPieces.length === 0) return null;
    if (remainingPieces.length === 1) return remainingPieces[0];

    // Try to form a valid stack with remaining pieces
    // stackEngine.lookup will automatically make the first piece the carrier
    const remainingRoles = remainingPieces.map((p) => this.getRoleFlag(p));
    const newStackState = stackEngine.lookup(remainingRoles);

    if (!newStackState) {
      // If lookup fails, manually create stack with first piece as carrier
      const [newCarrier, ...newCarried] = remainingPieces;
      return {
        ...newCarrier,
        carrying: newCarried.length > 0 ? newCarried : undefined
      } as T;
    }

    return this.makePieceFromCoreStack(newStackState, remainingPieces);
  }

  /**
   * Convert core stack state (bigint) back to nested piece format
   * @param stackState Encoded stack state from StackEngine
   * @param flatPieces All pieces involved in the stack (flattened)
   * @returns Reconstructed piece with carrying array
   */
  private makePieceFromCoreStack(stackState: bigint, flatPieces: T[]): T {
    // Build role → piece index for O(1) lookups
    const roleMap = new Map<number, T>();
    for (const piece of flatPieces) {
      roleMap.set(this.getRoleFlag(piece), piece);
    }

    // Extract carrier (stored in lowest 16 bits)
    const carrierRole = Number(stackState & 0xffffn);
    const carrier = roleMap.get(carrierRole)!;

    const carrying: T[] = [];

    // Extract carried pieces from slots 1-3 (each 16 bits)
    for (let slot = 1; slot <= 3; slot++) {
      const slotRole = Number((stackState >> BigInt(slot * 16)) & 0xffffn);
      if (slotRole) {
        const piece = roleMap.get(slotRole);
        if (piece) carrying.push(piece);
      }
    }

    return {
      ...carrier,
      carrying: carrying.length > 0 ? carrying : undefined
    } as T;
  }

  /**
   * Flatten nested piece structure into a single-level array
   * Recursively extracts all carried pieces and removes the carrying property
   * @param pieces Pieces with potential nested carrying arrays
   * @returns Flat array of all pieces without carrying relationships
   */
  private flattenPieces(pieces: T[]): T[] {
    const result: T[] = [];

    for (const piece of pieces) {
      const { carrying, ...pieceWithoutCarrying } = piece as unknown as {
        carrying?: T[];
        [key: string]: unknown;
      };
      result.push(pieceWithoutCarrying as T);

      if (carrying?.length) {
        result.push(...this.flattenPieces(carrying));
      }
    }

    return result;
  }
}
