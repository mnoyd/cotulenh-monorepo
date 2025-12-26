/**
 * Generate all valid piece combinations from blueprints
 *
 * Converts a numeric blueprint (role combinations rules) into a Map
 * of all valid stack combinations, ready for O(1) runtime lookups.
 *
 * Algorithm:
 * 1. Collect all possible roles from the blueprint
 * 2. Add single-piece stacks (every role can stand alone)
 * 3. Recursively generate multi-piece combinations per carrier
 * 4. Deduplicate and return as Map<roleMask, stackState>
 */

/** Numeric blueprint format (carrier role → allowed roles per slot) */
interface Blueprint {
  [carrierRole: number]: number[][];
}

/** Intermediate stack representation during generation */
interface PredefinedStack {
  pieces: number[];
  state: bigint;
}

/**
 * Generate all valid piece combinations from a numeric blueprint
 * @param blueprint Carrier → allowed roles per slot
 * @returns Map of role masks to stack states, ready for runtime lookups
 */
export function generatePredefinedStacks(blueprint: Blueprint): Map<number, bigint> {
  const stacks: PredefinedStack[] = [];

  // Collect all unique roles (carriers + all carried pieces)
  const allRoles = new Set<number>();
  for (const carrierRole of Object.keys(blueprint)) {
    allRoles.add(Number(carrierRole));
  }
  for (const slots of Object.values(blueprint)) {
    for (const slot of slots) {
      for (const role of slot) {
        allRoles.add(role);
      }
    }
  }

  // Every role can exist as a single piece
  for (const role of allRoles) {
    stacks.push({ pieces: [role], state: BigInt(role) });
  }

  // Generate all multi-piece combinations
  for (const [carrierStr, slots] of Object.entries(blueprint)) {
    const carrier = Number(carrierStr);
    generateCombinations(carrier, slots, [], 0, stacks);
  }

  // Deduplicate by role mask and return as Map
  const result = new Map<number, bigint>();
  for (const stack of stacks) {
    const mask = stack.pieces.reduce((m, p) => m | p, 0);
    if (!result.has(mask)) {
      result.set(mask, stack.state);
    }
  }

  return result;
}

/**
 * Recursively generate all valid piece combinations for a carrier
 * Uses backtracking to avoid temporary array allocations
 *
 * For each slot, tries:
 * 1. Empty slot (skip to next)
 * 2. Each allowed role (if not already used)
 *
 * @param carrier Root piece role
 * @param slots Allowed roles per slot (index = slot number)
 * @param current In-progress piece list (mutated for backtracking)
 * @param slotIndex Current slot being filled
 * @param results Output array to accumulate valid stacks
 */
function generateCombinations(
  carrier: number,
  slots: number[][],
  current: number[],
  slotIndex: number,
  results: PredefinedStack[]
): void {
  if (slotIndex >= slots.length) {
    if (current.length > 0) {
      // Skip carrier-alone (already added as single piece)
      const pieces = [carrier, ...current];
      let state = BigInt(carrier);
      for (let i = 0; i < current.length; i++) {
        state |= BigInt(current[i]) << BigInt((i + 1) * 16);
      }
      results.push({ pieces, state });
    }
    return;
  }

  // Try leaving this slot empty
  generateCombinations(carrier, slots, current, slotIndex + 1, results);

  // Try each allowed role in this slot (if not already used)
  for (const piece of slots[slotIndex]) {
    if (!current.includes(piece)) {
      current.push(piece);
      generateCombinations(carrier, slots, current, slotIndex + 1, results);
      current.pop(); // Backtrack
    }
  }
}
