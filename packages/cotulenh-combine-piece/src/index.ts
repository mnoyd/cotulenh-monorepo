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

// Piece interface
interface Piece {
  color: string;
  role: string;
  heroic: boolean;
  carrying?: Piece[];
}

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

// Main API - only 2 functions
export class PieceStacker {
  /**
   * Combine array of pieces into one stack
   * Returns combined piece with carrying array in slot order, or null if invalid
   */
  static combine(pieces: Piece[]): Piece | null {
    if (!pieces.length) return null;

    // Check all same color
    const color = pieces[0].color;
    if (!pieces.every((p) => p.color === color)) return null;

    // Flatten all pieces and get role numbers
    const flatPieces = this.flattenPieces(pieces);
    const roleNumbers = flatPieces.map((p) => this.getRoleNumber(p.role));

    // Call CORE ENGINE - THE ONLY METHOD
    const stackState = stackEngine.lookup(roleNumbers);
    if (!stackState) return null;

    // Convert core stack to piece format
    return this.makePieceFromCoreStack(stackState, flatPieces);
  }

  /**
   * Remove piece with specific role from stack
   * Returns remaining stack or null if nothing left
   */
  static remove(stackPiece: Piece, roleToRemove: string): Piece | null {
    // Flatten the stack
    const flatPieces = this.flattenPieces([stackPiece]);

    // Remove pieces with the target role
    const remainingPieces = flatPieces.filter((p) => p.role !== roleToRemove);

    if (remainingPieces.length === 0) return null;
    if (remainingPieces.length === 1) {
      return {
        color: remainingPieces[0].color,
        role: remainingPieces[0].role,
        heroic: remainingPieces[0].heroic
      };
    }

    // Try to recombine remaining pieces
    return this.combine(remainingPieces);
  }

  /**
   * Convert core stack to nested piece format - SIMPLIFIES THE WRAPPER
   */
  private static makePieceFromCoreStack(stackState: bigint, flatPieces: Piece[]): Piece {
    // Extract carrier from bigint (wrapper handles extraction)
    const carrierRole = Number(stackState & 0xffffn);
    const carrier = flatPieces.find((p) => this.getRoleNumber(p.role) === carrierRole)!;

    const result: Piece = {
      color: carrier.color,
      role: carrier.role,
      heroic: carrier.heroic,
      carrying: []
    };

    // Add pieces to carrying array in slot order (wrapper handles extraction)
    for (let slot = 1; slot <= 3; slot++) {
      const slotRole = Number((stackState >> BigInt(slot * 16)) & 0xffffn);
      if (slotRole) {
        const piece = flatPieces.find((p) => this.getRoleNumber(p.role) === slotRole)!;
        result.carrying!.push({
          color: piece.color,
          role: piece.role,
          heroic: piece.heroic
        });
      }
    }

    return result;
  }

  // Helper methods
  private static flattenPieces(pieces: Piece[]): Piece[] {
    const result: Piece[] = [];

    for (const piece of pieces) {
      // Add the piece itself (without carrying)
      result.push({
        color: piece.color,
        role: piece.role,
        heroic: piece.heroic
      });

      // Add carried pieces recursively
      if (piece.carrying?.length) {
        result.push(...this.flattenPieces(piece.carrying));
      }
    }

    return result;
  }

  private static getRoleNumber(roleName: string): number {
    const roleKey = roleName.toUpperCase() as keyof typeof ROLE_FLAGS;
    return ROLE_FLAGS[roleKey] || 0;
  }
}
