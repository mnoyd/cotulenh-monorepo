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
  constructor(private readonly getRoleFlag: (piece: T) => number) {}

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
   * Remove piece with specific role from stack
   */
  remove(stackPiece: T, roleToRemove: string): T | null {
    // Convert role string to flag using ROLE_FLAGS
    const roleKey = roleToRemove.toUpperCase() as keyof typeof ROLE_FLAGS;
    const roleFlag = ROLE_FLAGS[roleKey] || 0;

    // Flatten the stack
    const flatPieces = this.flattenPieces([stackPiece]);

    // Remove pieces with the target role
    const remainingPieces = flatPieces.filter((p) => this.getRoleFlag(p) !== roleFlag);

    if (remainingPieces.length === 0) return null;
    if (remainingPieces.length === 1) {
      return remainingPieces[0];
    }

    // Try to recombine remaining pieces
    return this.combine(remainingPieces);
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
      // Add the piece itself (without carrying)
      result.push(piece);

      // Add carried pieces recursively
      const carrying = (piece as any).carrying;
      if (carrying?.length) {
        result.push(...this.flattenPieces(carrying));
      }
    }

    return result;
  }

  // Static methods for backward compatibility with tests
  static combine<T>(pieces: T[]): T | null {
    // Create a default instance for standard pieces
    const defaultStacker = new PieceStacker<T>((piece: any) => {
      const roleKey = piece.role.toUpperCase() as keyof typeof ROLE_FLAGS;
      return ROLE_FLAGS[roleKey] || 0;
    });
    return defaultStacker.combine(pieces);
  }

  static remove<T>(stackPiece: T, roleToRemove: string): T | null {
    // Create a default instance for standard pieces
    const defaultStacker = new PieceStacker<T>((piece: any) => {
      const roleKey = piece.role.toUpperCase() as keyof typeof ROLE_FLAGS;
      return ROLE_FLAGS[roleKey] || 0;
    });
    return defaultStacker.remove(stackPiece, roleToRemove);
  }
}
