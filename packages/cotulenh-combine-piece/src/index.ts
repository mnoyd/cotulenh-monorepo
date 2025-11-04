// Pure number-based stack core implementation
// Works with role flags as numbers, no objects or external dependencies

// Role bit flags
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

// Role mapping type
export type RoleMapping = Record<string, keyof typeof ROLE_FLAGS>;

// Default role mapping (1:1 with ROLE_FLAGS)
export const DEFAULT_ROLE_MAPPING: RoleMapping = {
  COMMANDER: 'COMMANDER',
  INFANTRY: 'INFANTRY',
  MILITIA: 'MILITIA',
  ARTILLERY: 'ARTILLERY',
  ANTI_AIR: 'ANTI_AIR',
  MISSILE: 'MISSILE',
  TANK: 'TANK',
  AIR_FORCE: 'AIR_FORCE',
  ENGINEER: 'ENGINEER',
  NAVY: 'NAVY',
  HEADQUARTER: 'HEADQUARTER'
};

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

// Import pre-calculated stacks from generated file
import { PREDEFINED_STACKS } from './predefined-stacks.js';

// Ultra-minimalist stack engine - ONE METHOD ONLY
class StackEngine {
  private readonly stackMap: Map<number, bigint>;

  constructor() {
    this.stackMap = new Map(PREDEFINED_STACKS);
  }

  // THE ONLY METHOD - takes numbers, returns stack state
  lookup(pieces: number[]): bigint | null {
    if (!pieces.length || pieces.length > 4) return null;
    if (new Set(pieces).size !== pieces.length) return null; // No duplicates

    const mask = pieces.reduce((m, p) => m | p, 0);
    return this.stackMap.get(mask) ?? null;
  }
}

// Global engine instance - initialized once, reused everywhere
const stackEngine = new StackEngine();

// Export the ultra-minimalist engine for external use
export { StackEngine };

// Generic PieceStacker that works with any piece type
export class PieceStacker<T> {
  private readonly getRoleFlag: (piece: T) => number;

  constructor(
    getRoleFlagOrRoleExtractor: ((piece: T) => number) | ((piece: T) => string),
    roleMapping?: RoleMapping
  ) {
    if (roleMapping) {
      // If roleMapping is provided, assume the second parameter extracts role strings
      const roleExtractor = getRoleFlagOrRoleExtractor as (piece: T) => string;
      const roleMapper = createRoleMapper(roleMapping);
      this.getRoleFlag = (piece: T) => roleMapper(roleExtractor(piece));
    } else {
      // If no roleMapping, assume the parameter directly returns role flags
      this.getRoleFlag = getRoleFlagOrRoleExtractor as (piece: T) => number;
    }
  }

  /**
   * Create a PieceStacker with custom role mapping
   * @param roleExtractor - Function that extracts role string from piece
   * @param roleMapping - Mapping from user role names to internal ROLE_FLAGS keys
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
   *
   * When carrier is removed, automatically promotes first remaining piece to carrier
   */
  remove(stackPiece: T, pieceToRemove: T): T | null {
    // Flatten the piece to remove and get all its role flags
    const flatPiecesToRemove = this.flattenPieces([pieceToRemove]);
    const rolesToRemove = flatPiecesToRemove.map((p) => this.getRoleFlag(p));

    // Fast path: if removing from a single piece, just check if it matches any role to remove
    const stackPieceRole = this.getRoleFlag(stackPiece);
    const carrying = (stackPiece as any).carrying;

    if (!carrying || carrying.length === 0) {
      // Single piece - return null if it matches any role to remove, otherwise return unchanged
      return rolesToRemove.includes(stackPieceRole) ? null : stackPiece;
    }

    // Multi-piece stack: get all pieces and filter out removed ones
    const flatPieces = this.flattenPieces([stackPiece]);
    const remainingPieces = flatPieces.filter((p) => !rolesToRemove.includes(this.getRoleFlag(p)));

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
   * Get stack state for a piece (convert piece to bigint representation)
   */
  private getStackState(piece: T): bigint | null {
    const flatPieces = this.flattenPieces([piece]);
    const roleNumbers = flatPieces.map(this.getRoleFlag);
    return stackEngine.lookup(roleNumbers);
  }

  /**
   * Convert core stack to nested piece format
   */
  private makePieceFromCoreStack(stackState: bigint, flatPieces: T[]): T {
    // Extract carrier from bigint
    const carrierRole = Number(stackState & 0xffffn);
    const carrier = flatPieces.find((p) => this.getRoleFlag(p) === carrierRole)!;

    const carrying: T[] = [];

    // Add pieces to carrying array in slot order
    for (let slot = 1; slot <= 3; slot++) {
      const slotRole = Number((stackState >> BigInt(slot * 16)) & 0xffffn);
      if (slotRole) {
        const piece = flatPieces.find((p) => this.getRoleFlag(p) === slotRole)!;
        carrying.push(piece);
      }
    }

    // Return carrier with carrying array
    return {
      ...carrier,
      carrying: carrying.length > 0 ? carrying : undefined
    } as T;
  }

  // Helper method to flatten pieces
  private flattenPieces(pieces: T[]): T[] {
    const result: T[] = [];

    for (const piece of pieces) {
      // Add the piece itself (without carrying property)
      const { carrying, ...pieceWithoutCarrying } = piece as any;
      result.push(pieceWithoutCarrying as T);

      // Add carried pieces recursively
      if (carrying?.length) {
        result.push(...this.flattenPieces(carrying));
      }
    }

    return result;
  }
}
