// 1 function: blueprint → predefined stacks
// Pure logic, no file I/O

interface Blueprint {
  [carrierRole: number]: number[][]; // carrier → [slot1_roles[], slot2_roles[], ...]
}

interface PredefinedStack {
  pieces: number[];
  state: bigint;
}

export function generatePredefinedStacks(blueprint: Blueprint): Map<number, bigint> {
  const stacks: PredefinedStack[] = [];

  // Add all single pieces (every role can exist alone)
  const allRoles = new Set<number>();
  for (const k of Object.keys(blueprint)) {
    allRoles.add(Number(k));
  }
  for (const slots of Object.values(blueprint)) {
    for (const slot of slots) {
      for (const role of slot) {
        allRoles.add(role);
      }
    }
  }

  for (const role of allRoles) {
    stacks.push({ pieces: [role], state: BigInt(role) });
  }

  // Add carrier combinations
  for (const [carrierStr, slots] of Object.entries(blueprint)) {
    const carrier = Number(carrierStr);
    generateCombinations(carrier, slots, [], 0, stacks);
  }

  // Remove duplicates and return as Map
  const result = new Map<number, bigint>();
  for (const stack of stacks) {
    const mask = stack.pieces.reduce((m, p) => m | p, 0);
    if (!result.has(mask)) {
      result.set(mask, stack.state);
    }
  }

  return result;
}

function generateCombinations(
  carrier: number,
  slots: number[][],
  current: number[],
  slotIndex: number,
  results: PredefinedStack[]
) {
  if (slotIndex >= slots.length) {
    if (current.length > 0) {
      // Skip empty (carrier alone already added)
      const pieces = [carrier, ...current];
      let state = BigInt(carrier);
      for (let i = 0; i < current.length; i++) {
        state |= BigInt(current[i]) << BigInt((i + 1) * 16);
      }
      results.push({ pieces, state });
    }
    return;
  }

  // Try empty slot
  generateCombinations(carrier, slots, current, slotIndex + 1, results);

  // Try each piece in this slot
  for (const piece of slots[slotIndex]) {
    if (!current.includes(piece)) {
      generateCombinations(carrier, slots, [...current, piece], slotIndex + 1, results);
    }
  }
}
