// File: packages/create-combine/src/blueprints.ts
// This file contains the blueprint definitions

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

// For backward compatibility
export const humanlikeRoles: Role[] = ['commander', 'infantry', 'militia'];
export const heavyEquipment: Role[] = ['artillery', 'anti_air', 'missile'];

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

// Keep the old interface for backward compatibility
export interface CarrierBlueprint {
  canCarryRoles: Role[][]; // 2D array: outer array = slots, inner array = allowed roles for that slot
}

// Define all carrier blueprints (legacy format)
export const navyBlueprint: CarrierBlueprint = {
  canCarryRoles: [
    ['air_force'], // Slot 0: air_force
    [...humanlikeRoles, 'tank'] // Slot 1: humanlike or tank
  ]
};

export const tankBlueprint: CarrierBlueprint = {
  canCarryRoles: [humanlikeRoles] // Slot 0: can carry humanlike role
};

export const engineerBlueprint: CarrierBlueprint = {
  canCarryRoles: [heavyEquipment] // Slot 0: can carry heavy equipment
};

export const airForceBlueprint: CarrierBlueprint = {
  canCarryRoles: [
    ['tank'], // Slot 0: can carry tank
    humanlikeRoles // Slot 1: can carry humanlike roles
  ]
};

export const headquarterBlueprint: CarrierBlueprint = {
  canCarryRoles: [['commander']] // Slot 0: can carry commander
};

// Export a mapping of roles to their blueprints (legacy format)
export const carrierBlueprints: { [key: string]: CarrierBlueprint } = {
  navy: navyBlueprint,
  tank: tankBlueprint,
  engineer: engineerBlueprint,
  air_force: airForceBlueprint,
  headquarter: headquarterBlueprint
};

// Helper function to check if a role can be carried in a slot
export function canCarryRole(carrierRole: string, slotIndex: number, roleToCarry: string): boolean {
  // Get the blueprint for this carrier
  const blueprint = BLUEPRINTS[carrierRole];
  if (!blueprint || slotIndex >= blueprint.canCarryRoles.length) {
    return false;
  }

  // Get the bit flag for the role to carry
  const roleFlag = ROLE_TO_FLAG[roleToCarry];
  if (!roleFlag) {
    return false;
  }

  // Check if the slot can carry this role using bitwise AND
  // If the result is non-zero, the role is allowed
  return (blueprint.canCarryRoles[slotIndex] & roleFlag) !== 0;
}

// Generic piece interface to work with both UI and Core
export interface GenericPiece {
  color: string;
  carrying?: GenericPiece[];
  [key: string]: any; // For other properties
}

/**
 * Forms a stack from two pieces according to blueprints
 * @param piece1 First piece or stack
 * @param piece2 Second piece or stack
 * @param getRoleFunc Function to extract role/type from a piece
 * @param mapRoleFunc Function to map role/type to blueprint key
 * @return The resulting stack if valid, null otherwise
 */
export function formStack<P extends GenericPiece>(
  piece1: P,
  piece2: P,
  getRoleFunc: (piece: P) => string,
  mapRoleFunc: (role: string) => string = (r) => r
): P | null {
  // Check if pieces have the same color
  if (piece1.color !== piece2.color) {
    return null; // Cannot combine pieces of different colors
  }

  // First, flatten both stacks to get individual pieces
  const flattenedPieces1 = flattenStack(piece1);
  const flattenedPieces2 = flattenStack(piece2);

  // Combine all pieces
  const allPieces = [...flattenedPieces1, ...flattenedPieces2];

  // Find carrier
  const carrier = determineCarrier(allPieces, getRoleFunc, mapRoleFunc);
  if (!carrier) {
    return null; // No valid carrier found among the pieces
  }

  // Check if remaining pieces can be carrying by the carrier
  const piecesToCarry = allPieces.filter((p) => p !== carrier);

  // Try to assign pieces to carrier's slots
  const result = assignPiecesToCarrier(carrier, piecesToCarry, getRoleFunc, mapRoleFunc);
  return result;

  // Helper functions within closure for cleaner interface

  /**
   * Flattens a stack into individual pieces
   */
  function flattenStack(piece: P): P[] {
    // Create a new piece without carrying pieces
    const clonedPiece = { ...piece } as P;
    delete (clonedPiece as any).carrying;

    // Initialize result with the cloned piece
    const result: P[] = [clonedPiece];

    // Add all carrying pieces
    if (piece.carrying && piece.carrying.length > 0) {
      for (const carryingPiece of piece.carrying as P[]) {
        result.push(...flattenStack(carryingPiece));
      }
    }

    return result;
  }

  /**
   * Determines which piece should be the carrier from a collection of pieces
   */
  function determineCarrier(
    pieces: P[],
    getRoleFunc: (piece: P) => string,
    mapRoleFunc: (role: string) => string
  ): P | null {
    // First, identify all potential carriers
    const potentialCarriers = pieces.filter((piece) => {
      const role = getRoleFunc(piece);
      const mappedRole = mapRoleFunc(role);
      return carrierBlueprints[mappedRole] !== undefined;
    });

    if (potentialCarriers.length === 0) {
      return null; // No carrier found
    }

    // If only one potential carrier, it's the carrier
    if (potentialCarriers.length === 1) {
      return potentialCarriers[0];
    }

    // Multiple potential carriers - determine hierarchy
    for (let i = 0; i < potentialCarriers.length; i++) {
      const candidateCarrier = potentialCarriers[i];
      const candidateRole = mapRoleFunc(getRoleFunc(candidateCarrier));
      const blueprint = carrierBlueprints[candidateRole];

      // Check if this candidate can be the carrier for all other potential carriers
      const canCarryAll = potentialCarriers.every((potentialCarrying, j) => {
        if (i === j) return true; // Skip self

        const carryingRole = mapRoleFunc(getRoleFunc(potentialCarrying));

        // Check if candidateCarrier can carry potentialCarrying in any slot
        return blueprint.canCarryRoles.some((slotRoles) => slotRoles.includes(carryingRole));
      });

      if (canCarryAll) {
        return candidateCarrier;
      }
    }

    return null; // No valid carrier found
  }

  /**
   * Attempts to assign pieces to a carrier's slots according to blueprint
   */
  function assignPiecesToCarrier(
    carrier: P,
    piecesToCarry: P[],
    getRoleFunc: (piece: P) => string,
    mapRoleFunc: (role: string) => string
  ): P | null {
    const carrierRole = mapRoleFunc(getRoleFunc(carrier));
    const blueprint = BLUEPRINTS[carrierRole];

    if (!blueprint) {
      return null; // No blueprint for this carrier
    }

    // Create a copy of pieces to assign
    const remainingPieces = [...piecesToCarry];

    // Track filled slots and which pieces are in which slots
    const slotAssignments: { [slotIndex: number]: P[] } = {};

    // For each piece we need to carry, find a valid slot
    for (const piece of piecesToCarry) {
      let assigned = false;
      const pieceRole = mapRoleFunc(getRoleFunc(piece));
      const pieceRoleFlag = ROLE_TO_FLAG[pieceRole];

      if (!pieceRoleFlag) continue; // Skip if role has no bit flag

      // Check each slot in the blueprint
      for (let slotIndex = 0; slotIndex < blueprint.canCarryRoles.length; slotIndex++) {
        const slotRoleFlags = blueprint.canCarryRoles[slotIndex];

        // Check if this piece's role is allowed in this slot using bitwise AND
        if ((slotRoleFlags & pieceRoleFlag) !== 0) {
          // Check if this slot is already filled
          if (!slotAssignments[slotIndex]) {
            // Assign piece to this slot (only one allowed)
            slotAssignments[slotIndex] = [piece];

            // Remove piece from remaining pieces
            const pieceIndex = remainingPieces.indexOf(piece);
            if (pieceIndex > -1) {
              remainingPieces.splice(pieceIndex, 1);
            }

            assigned = true;
            break;
          }
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
      for (const slotIndex in slotAssignments) {
        carryingPieces.push(...slotAssignments[slotIndex]);
      }

      // Return carrier with carrying pieces
      const result = { ...carrier, carrying: carryingPieces } as P;
      return result;
    }

    return null; // Some pieces couldn't be assigned
  }
}

/**
 * Creates a combined stack from an array of pieces by iteratively combining them
 * @param pieces Array of pieces to combine
 * @param getRoleFunc Function to extract role/type from a piece
 * @param mapRoleFunc Function to map role/type to blueprint key
 * @return Object containing the combined piece (if successful) and array of pieces that couldn't be combined
 */
export function createCombineStackFromPieces<P extends GenericPiece>(
  pieces: P[],
  getRoleFunc: (piece: P) => string,
  mapRoleFunc: (role: string) => string = (r) => r
): {
  combined: P | undefined;
  uncombined: P[] | undefined;
} {
  if (!pieces || pieces.length === 0) return { combined: undefined, uncombined: undefined };
  if (pieces.length === 1) return { combined: pieces[0], uncombined: undefined };

  const uncombined: P[] = [];
  const piece = pieces.reduce((acc, p) => {
    if (!acc) return p;

    // Try to combine the accumulated piece with the current piece
    const combined = formStack(acc, p, getRoleFunc, mapRoleFunc);
    if (!combined) {
      uncombined.push(p);
      return acc;
    }
    return combined;
  }, pieces[0]);

  return {
    combined: piece,
    uncombined: uncombined.length > 0 ? uncombined.splice(1) : undefined
  };
}
