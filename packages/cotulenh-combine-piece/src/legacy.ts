/**
 * LEGACY IMPLEMENTATION - DO NOT USE
 *
 * This file contains the old bitwise-based piece combination implementation.
 * It has been replaced by the new data-driven approach in index.ts.
 *
 * This file is kept for reference only and is excluded from the build.
 *
 * @deprecated Use the new PieceCombiner class from index.ts instead
 */

// Define roles as bit flags instead of strings
export type Role = string; // Keep for backward compatibility
export type RoleBitFlag = number; // New type for bitwise operations

// Define role bit flags
export const ROLE_FLAGS = {
  COMMANDER: 1 << 0, // 0000001 (1)
  INFANTRY: 1 << 1, // 0000010 (2)
  MILITIA: 1 << 2, // 0000100 (4)
  ARTILLERY: 1 << 3, // 0001000 (8)
  ANTI_AIR: 1 << 4, // 0010000 (16)
  MISSILE: 1 << 5, // 0100000 (32)
  TANK: 1 << 6, // 1000000 (64)
  AIR_FORCE: 1 << 7, // 10000000 (128)
  ENGINEER: 1 << 8, // 100000000 (256)
  NAVY: 1 << 9, // 1000000000 (512)
  HEADQUARTER: 1 << 10 // 10000000000 (1024)
};

// Role mapping from string to bit flag
export const ROLE_TO_FLAG: Record<string, RoleBitFlag> = {
  commander: ROLE_FLAGS.COMMANDER,
  infantry: ROLE_FLAGS.INFANTRY,
  militia: ROLE_FLAGS.MILITIA,
  artillery: ROLE_FLAGS.ARTILLERY,
  anti_air: ROLE_FLAGS.ANTI_AIR,
  missile: ROLE_FLAGS.MISSILE,
  tank: ROLE_FLAGS.TANK,
  air_force: ROLE_FLAGS.AIR_FORCE,
  engineer: ROLE_FLAGS.ENGINEER,
  navy: ROLE_FLAGS.NAVY,
  headquarter: ROLE_FLAGS.HEADQUARTER
};

// Role groups using bitwise OR
export const HUMANLIKE_ROLES = ROLE_FLAGS.COMMANDER | ROLE_FLAGS.INFANTRY | ROLE_FLAGS.MILITIA;
export const HEAVY_EQUIPMENT = ROLE_FLAGS.ARTILLERY | ROLE_FLAGS.ANTI_AIR | ROLE_FLAGS.MISSILE;

// New blueprint interface using bitwise flags
export interface BitCarrierBlueprint {
  canCarryRoles: RoleBitFlag[]; // Each slot is represented by a bit flag
}

// Define all carrier blueprints using bit flags
export const BLUEPRINTS: Record<string, BitCarrierBlueprint> = {
  navy: {
    canCarryRoles: [
      ROLE_FLAGS.AIR_FORCE, // Slot 0: air_force only
      HUMANLIKE_ROLES | ROLE_FLAGS.TANK // Slot 1: humanlike or tank
    ]
  },
  tank: {
    canCarryRoles: [HUMANLIKE_ROLES] // Slot 0: humanlike roles only
  },
  engineer: {
    canCarryRoles: [HEAVY_EQUIPMENT] // Slot 0: heavy equipment only
  },
  air_force: {
    canCarryRoles: [
      ROLE_FLAGS.TANK, // Slot 0: tank only
      HUMANLIKE_ROLES // Slot 1: humanlike roles
    ]
  },
  headquarter: {
    canCarryRoles: [ROLE_FLAGS.COMMANDER] // Slot 0: commander only
  }
};

// Generic piece interface to work with both UI and Core
export interface LegacyGenericPiece {
  color: string;
  carrying?: LegacyGenericPiece[];
  [key: string]: any; // For other properties
}

/**
 * Utility functions for working with role flags
 */

// Check if a role flag is part of a role group
export function hasRole(roleGroup: RoleBitFlag, roleToCheck: RoleBitFlag): boolean {
  return (roleGroup & roleToCheck) !== 0;
}

// Add a role to a role group
export function addRole(roleGroup: RoleBitFlag, roleToAdd: RoleBitFlag): RoleBitFlag {
  return roleGroup | roleToAdd;
}

// Remove a role from a role group
export function removeRole(roleGroup: RoleBitFlag, roleToRemove: RoleBitFlag): RoleBitFlag {
  return roleGroup & ~roleToRemove;
}

/**
 * Legacy Factory class for creating and combining pieces
 * @deprecated Use PieceCombiner from the main module instead
 */
export class LegacyCombinePieceFactory<P extends LegacyGenericPiece> {
  private readonly getRoleFunc: (piece: P) => string;
  private readonly mapRoleFunc: (role: string) => string;

  /**
   * Creates a new CombinePieceFactory with the specified role functions
   * @param getRoleFunc Function to extract role/type from a piece
   * @param mapRoleFunc Function to map role/type to blueprint key
   */
  constructor(getRoleFunc: (piece: P) => string, mapRoleFunc: (role: string) => string = (r) => r) {
    this.getRoleFunc = getRoleFunc;
    this.mapRoleFunc = mapRoleFunc;
  }

  /**
   * Forms a stack from two pieces according to blueprints
   * @param piece1 First piece or stack
   * @param piece2 Second piece or stack
   * @return The resulting stack if valid, null otherwise
   */
  formStack(piece1: P, piece2: P): P | null {
    // Check if pieces have the same color
    if (piece1.color !== piece2.color) {
      return null; // Cannot combine pieces of different colors
    }

    // First, flatten both stacks to get individual pieces
    const flattenedPieces1 = this.flattenStack(piece1);
    const flattenedPieces2 = this.flattenStack(piece2);

    // Combine all pieces
    const allPieces = [...flattenedPieces1, ...flattenedPieces2];

    // Determine the carrier
    const carrier = this.determineCarrier(allPieces);
    if (!carrier) {
      return null; // No valid carrier found among the pieces
    }

    // Check if remaining pieces can be carried by the carrier
    const piecesToCarry = allPieces.filter((p) => p !== carrier);

    // Try to assign pieces to carrier's slots
    return this.assignPiecesToCarrier(carrier, piecesToCarry);
  }

  /**
   * Creates a combined stack from an array of pieces by iteratively combining them
   * @param pieces Array of pieces to combine
   * @return Object containing combined stack and uncombined pieces
   */
  createCombineStackFromPieces(pieces: P[]): {
    combined: P | undefined;
    uncombined: P[] | undefined;
  } {
    if (!pieces || pieces.length === 0) return { combined: undefined, uncombined: undefined };
    if (pieces.length === 1) return { combined: pieces[0], uncombined: undefined };

    // Use a bit mask to track which pieces have been combined
    let uncombinedMask = 0;

    // Start with the first piece as our accumulator
    let combinedPiece = pieces[0];

    // Try to combine each subsequent piece
    for (let i = 1; i < pieces.length; i++) {
      const currentPiece = pieces[i];
      const newCombined = this.formStack(combinedPiece, currentPiece);

      if (newCombined) {
        // Successfully combined
        combinedPiece = newCombined;
      } else {
        // Mark this piece as uncombined using addRole utility
        uncombinedMask = addRole(uncombinedMask, 1 << i);
      }
    }

    // Extract uncombined pieces using the bit mask
    const uncombined: P[] = [];
    if (uncombinedMask !== 0) {
      for (let i = 1; i < pieces.length; i++) {
        // Check if this piece is uncombined using hasRole utility
        if (hasRole(uncombinedMask, 1 << i)) {
          uncombined.push(pieces[i]);
        }
      }
    }

    return {
      combined: combinedPiece,
      uncombined: uncombined.length > 0 ? uncombined : undefined
    };
  }

  /**
   * Flattens a stack into individual pieces
   * @private
   */
  private flattenStack(piece: P): P[] {
    // Create a new piece without carrying pieces
    const clonedPiece = { ...piece } as P;
    delete (clonedPiece as any).carrying;

    // Initialize result with the cloned piece
    const result: P[] = [clonedPiece];

    // Add all carrying pieces
    if (piece.carrying && piece.carrying.length > 0) {
      for (const carryingPiece of piece.carrying as P[]) {
        result.push(...this.flattenStack(carryingPiece));
      }
    }

    return result;
  }

  /**
   * Determines which piece should be the carrier from a collection of pieces
   * @private
   */
  private determineCarrier(pieces: P[]): P | null {
    // First, identify all potential carriers with their role flags
    const potentialCarriers: Array<{ piece: P; roleFlag: number; roleName: string }> = [];

    // Build a list of potential carriers with their role information
    for (const piece of pieces) {
      const role = this.getRoleFunc(piece);
      const mappedRole = this.mapRoleFunc(role);
      const roleFlag = ROLE_TO_FLAG[mappedRole];

      // Check if this role can be a carrier
      if (BLUEPRINTS[mappedRole]) {
        potentialCarriers.push({
          piece,
          roleFlag,
          roleName: mappedRole
        });
      }
    }

    if (potentialCarriers.length === 0) {
      return null; // No carrier found
    }

    // If only one potential carrier, it's the carrier
    if (potentialCarriers.length === 1) {
      return potentialCarriers[0].piece;
    }

    // Create a bit mask of all potential carrier roles for quick lookups
    let allCarrierRolesMask = 0;
    for (const carrier of potentialCarriers) {
      // Use addRole utility to build the mask
      allCarrierRolesMask = addRole(allCarrierRolesMask, carrier.roleFlag);
    }

    // Multiple potential carriers - determine hierarchy using bitwise operations
    for (const candidateCarrier of potentialCarriers) {
      const blueprint = BLUEPRINTS[candidateCarrier.roleName];

      // Check if this candidate can carry all other potential carriers
      let canCarryAllRolesMask = 0;

      // Combine all roles this carrier can carry across all slots
      for (const slotRoles of blueprint.canCarryRoles) {
        canCarryAllRolesMask = addRole(canCarryAllRolesMask, slotRoles);
      }

      // Check if this carrier can carry all other carriers
      // by comparing with the mask of all other carrier roles
      // We need to remove this carrier's own role from the check
      const otherCarriersMask = removeRole(allCarrierRolesMask, candidateCarrier.roleFlag);

      // If all bits in otherCarriersMask are also set in canCarryAllRolesMask,
      // then this carrier can carry all other carriers
      if ((otherCarriersMask & canCarryAllRolesMask) === otherCarriersMask) {
        return candidateCarrier.piece;
      }
    }

    // If we need more precise slot assignment checking:
    for (const candidateCarrier of potentialCarriers) {
      const blueprint = BLUEPRINTS[candidateCarrier.roleName];

      // Check if this candidate can be the carrier for all other potential carriers
      const canCarryAll = potentialCarriers.every((potentialCarrying) => {
        // Skip self comparison
        if (potentialCarrying === candidateCarrier) return true;

        // Check if candidateCarrier can carry potentialCarrying in any slot
        return blueprint.canCarryRoles.some((slotRoles) =>
          hasRole(slotRoles, potentialCarrying.roleFlag)
        );
      });

      if (canCarryAll) {
        return candidateCarrier.piece;
      }
    }

    return null; // No valid carrier found
  }

  /**
   * Attempts to assign pieces to a carrier's slots according to blueprint
   * @private
   */
  private assignPiecesToCarrier(carrier: P, piecesToCarry: P[]): P | null {
    const carrierRole = this.mapRoleFunc(this.getRoleFunc(carrier));
    const blueprint = BLUEPRINTS[carrierRole];

    if (!blueprint) {
      return null; // No blueprint for this carrier
    }

    // Create a copy of pieces to assign
    const remainingPieces = [...piecesToCarry];

    // Track filled slots and which pieces are in which slots
    const slotAssignments: { [slotIndex: number]: P[] } = {};

    // Track which slots are already filled using a bit mask
    let filledSlotsMask = 0;

    // For each piece we need to carry, find a valid slot
    for (const piece of piecesToCarry) {
      const pieceRole = this.mapRoleFunc(this.getRoleFunc(piece));
      const pieceRoleFlag = ROLE_TO_FLAG[pieceRole];

      if (!pieceRoleFlag) continue; // Skip if role has no bit flag

      let assigned = false;

      // Check each slot in the blueprint
      for (let slotIndex = 0; slotIndex < blueprint.canCarryRoles.length; slotIndex++) {
        // Skip already filled slots using hasRole utility
        if (hasRole(filledSlotsMask, 1 << slotIndex)) continue;

        const slotRoleFlags = blueprint.canCarryRoles[slotIndex];

        // Check if this piece's role is allowed in this slot using hasRole utility
        if (hasRole(slotRoleFlags, pieceRoleFlag)) {
          // Assign piece to this slot
          slotAssignments[slotIndex] = [piece];

          // Mark this slot as filled using addRole utility
          filledSlotsMask = addRole(filledSlotsMask, 1 << slotIndex);

          // Remove piece from remaining pieces
          const pieceIndex = remainingPieces.indexOf(piece);
          if (pieceIndex > -1) {
            remainingPieces.splice(pieceIndex, 1);
          }

          assigned = true;
          break;
        }
      }

      // If we couldn't assign this piece, the stack is invalid
      if (!assigned) {
        return null;
      }
    }

    // If we've assigned all pieces, create the resulting stack
    if (remainingPieces.length === 0) {
      // Flatten slot assignments into a single carrying array
      const carryingPieces: P[] = [];

      // Use hasRole utility to iterate through filled slots
      for (let slotIndex = 0; slotIndex < blueprint.canCarryRoles.length; slotIndex++) {
        if (hasRole(filledSlotsMask, 1 << slotIndex) && slotAssignments[slotIndex]) {
          carryingPieces.push(...slotAssignments[slotIndex]);
        }
      }

      // Return carrier with carrying pieces
      const result = { ...carrier, carrying: carryingPieces } as P;
      return result;
    }

    return null; // Some pieces couldn't be assigned
  }
}
