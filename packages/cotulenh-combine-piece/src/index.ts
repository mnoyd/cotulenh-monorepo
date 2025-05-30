// File: packages/create-combine/src/blueprints.ts
// This file contains the blueprint definitions

// Let's assume we're using string literals for roles to work across both repos
export type Role = string;

export interface CarrierBlueprint {
  canCarryRoles: Role[][]; // 2D array: outer array = slots, inner array = allowed roles for that slot
}

// Define roles used in blueprints
export const humanlikeRoles: Role[] = ['commander', 'infantry', 'militia'];
export const heavyEquipment: Role[] = ['artillery', 'anti_air', 'missile'];

// Define all carrier blueprints
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

// Export a mapping of roles to their blueprints
export const carrierBlueprints: { [key: string]: CarrierBlueprint } = {
  navy: navyBlueprint,
  tank: tankBlueprint,
  engineer: engineerBlueprint,
  air_force: airForceBlueprint,
  headquarter: headquarterBlueprint
};

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
    const blueprint = carrierBlueprints[carrierRole];

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

      // Check each slot in the blueprint
      for (let slotIndex = 0; slotIndex < blueprint.canCarryRoles.length; slotIndex++) {
        const allowedRoles = blueprint.canCarryRoles[slotIndex];

        // Check if this piece's role is allowed in this slot
        if (allowedRoles.includes(pieceRole)) {
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
