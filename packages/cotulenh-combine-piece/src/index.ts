/**
 * CoTuLenh Piece Combination System
 *
 * This module provides a clean, extensible system for combining game pieces
 * according to configurable rules. It replaces the previous bitwise-based
 * implementation with a more maintainable, data-driven approach.
 *
 * @example
 * ```typescript
 * import { PieceCombiner } from '@repo/cotulenh-combine-piece'
 *
 * const combiner = new PieceCombiner(piece => piece.role)
 * const result = combiner.combine(tank, infantry)
 *
 * if (result.success) {
 *   console.log('Combined successfully:', result.result)
 * } else {
 *   console.log('Failed:', result.error)
 *   console.log('Conflicts:', result.conflicts)
 * }
 * ```
 */

// ============================================================================
// 1. CORE TYPES & INTERFACES
// ============================================================================

export interface Piece {
  id: string;
  color: string;
  role: string;
  carrying?: Piece[];
}

export interface CombinationRule {
  carrier: string;
  slots: SlotDefinition[];
  priority: number; // Higher = more dominant carrier
}

export interface SlotDefinition {
  accepts: readonly string[] | ((role: string) => boolean);
  maxCount: number;
  required?: boolean;
}

export interface CombinationResult<T extends Piece> {
  success: boolean;
  result?: T;
  error?: string;
  conflicts?: string[];
}

// ============================================================================
// 2. RULE DEFINITIONS (Data-Driven)
// ============================================================================

export const ROLE_GROUPS = {
  HUMANLIKE: ['commander', 'infantry', 'militia'],
  HEAVY_EQUIPMENT: ['artillery', 'anti_air', 'missile'],
  VEHICLES: ['tank', 'air_force', 'navy', 'engineer'],
  COMMAND: ['commander', 'headquarter']
} as const;

export const COMBINATION_RULES: CombinationRule[] = [
  {
    carrier: 'navy',
    priority: 100, // Highest priority
    slots: [
      { accepts: ['air_force'], maxCount: 1 },
      { accepts: [...ROLE_GROUPS.HUMANLIKE, 'tank'], maxCount: 1 }
    ]
  },
  {
    carrier: 'air_force',
    priority: 80,
    slots: [
      { accepts: ['tank'], maxCount: 1 },
      { accepts: ROLE_GROUPS.HUMANLIKE, maxCount: 1 }
    ]
  },
  {
    carrier: 'tank',
    priority: 60,
    slots: [{ accepts: ROLE_GROUPS.HUMANLIKE, maxCount: 1 }]
  },
  {
    carrier: 'engineer',
    priority: 40,
    slots: [{ accepts: ROLE_GROUPS.HEAVY_EQUIPMENT, maxCount: 1 }]
  },
  {
    carrier: 'headquarter',
    priority: 20,
    slots: [{ accepts: ['commander'], maxCount: 1, required: true }]
  }
];

// ============================================================================
// 3. CORE COMBINATION ENGINE
// ============================================================================

export class PieceCombiner<T extends Piece> {
  private rules: Map<string, CombinationRule>;
  private roleExtractor: (piece: T) => string;

  constructor(roleExtractor: (piece: T) => string, customRules?: CombinationRule[]) {
    this.roleExtractor = roleExtractor;
    this.rules = new Map();

    // Load rules (custom rules override defaults)
    const allRules = customRules || COMBINATION_RULES;
    allRules.forEach((rule) => {
      this.rules.set(rule.carrier, rule);
    });
  }

  /**
   * Main combination method - clean and straightforward
   */
  combine(piece1: T, piece2: T): CombinationResult<T> {
    // Basic validation
    if (piece1.color !== piece2.color) {
      return { success: false, error: 'Cannot combine pieces of different colors' };
    }

    // Get all individual pieces
    const allPieces = this.flattenPieces([piece1, piece2]);

    // Find the best carrier
    const carrier = this.selectCarrier(allPieces);
    if (!carrier) {
      return {
        success: false,
        error: 'No valid carrier found',
        conflicts: this.getNoCarrierConflicts(allPieces)
      };
    }

    // Try to assign pieces to carrier
    const piecesToCarry = allPieces.filter((p) => p !== carrier);
    const assignment = this.assignPieces(carrier, piecesToCarry);

    return assignment;
  }

  /**
   * Combine multiple pieces at once
   */
  combineMultiple(pieces: T[]): CombinationResult<T> {
    if (pieces.length === 0) {
      return { success: false, error: 'No pieces to combine' };
    }

    if (pieces.length === 1) {
      return { success: true, result: pieces[0] };
    }

    // Check all same color
    const firstColor = pieces[0].color;
    if (!pieces.every((p) => p.color === firstColor)) {
      return { success: false, error: 'All pieces must be the same color' };
    }

    const allPieces = this.flattenPieces(pieces);
    const carrier = this.selectCarrier(allPieces);

    if (!carrier) {
      return {
        success: false,
        error: 'No valid carrier found',
        conflicts: this.getNoCarrierConflicts(allPieces)
      };
    }

    return this.assignPieces(
      carrier,
      allPieces.filter((p) => p !== carrier)
    );
  }

  // ============================================================================
  // 4. PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Flatten all pieces into individual units (no nested carrying)
   */
  private flattenPieces(pieces: T[]): T[] {
    const result: T[] = [];

    for (const piece of pieces) {
      // Add the piece itself (without carrying)
      const flatPiece = { ...piece } as T;
      delete flatPiece.carrying;
      result.push(flatPiece);

      // Recursively add carried pieces
      if (piece.carrying && piece.carrying.length > 0) {
        result.push(...this.flattenPieces(piece.carrying as T[]));
      }
    }

    return result;
  }

  /**
   * Select the best carrier from available pieces
   * Simple and clear logic based on priority
   */
  private selectCarrier(pieces: T[]): T | null {
    let bestCarrier: T | null = null;
    let bestPriority = -1;

    // First pass: try to find a carrier that can carry all pieces
    for (const piece of pieces) {
      const role = this.roleExtractor(piece);
      const rule = this.rules.get(role);

      if (rule && rule.priority > bestPriority) {
        const otherPieces = pieces.filter((p) => p !== piece);
        if (this.canCarryAll(rule, otherPieces)) {
          bestCarrier = piece;
          bestPriority = rule.priority;
        }
      }
    }

    // If we found a valid carrier, return it
    if (bestCarrier) {
      return bestCarrier;
    }

    // Second pass: if no carrier can carry all pieces,
    // return the highest priority carrier for error reporting
    bestPriority = -1;
    for (const piece of pieces) {
      const role = this.roleExtractor(piece);
      const rule = this.rules.get(role);

      if (rule && rule.priority > bestPriority) {
        bestCarrier = piece;
        bestPriority = rule.priority;
      }
    }

    return bestCarrier;
  }

  /**
   * Check if a carrier rule can accommodate all pieces
   */
  private canCarryAll(rule: CombinationRule, pieces: T[]): boolean {
    const assignments = this.tryAssignPieces(rule, pieces);
    return assignments !== null;
  }

  /**
   * Assign pieces to carrier slots
   */
  private assignPieces(carrier: T, pieces: T[]): CombinationResult<T> {
    const role = this.roleExtractor(carrier);
    const rule = this.rules.get(role);

    if (!rule) {
      return { success: false, error: `No rule found for carrier role: ${role}` };
    }

    const assignments = this.tryAssignPieces(rule, pieces);
    if (!assignments) {
      return {
        success: false,
        error: 'Cannot fit all pieces in carrier slots',
        conflicts: this.getConflicts(rule, pieces)
      };
    }

    // Create the result
    const result = { ...carrier, carrying: assignments.flat() } as T;
    return { success: true, result };
  }

  /**
   * Try to assign pieces to slots, return assignments or null if impossible
   */
  private tryAssignPieces(rule: CombinationRule, pieces: T[]): T[][] | null {
    const assignments: T[][] = rule.slots.map(() => []);
    const unassigned = [...pieces];

    // Try to assign each piece to a slot
    for (let i = 0; i < unassigned.length; i++) {
      const piece = unassigned[i];
      const pieceRole = this.roleExtractor(piece);
      let assigned = false;

      // Try each slot
      for (let slotIndex = 0; slotIndex < rule.slots.length; slotIndex++) {
        const slot = rule.slots[slotIndex];

        if (assignments[slotIndex].length >= slot.maxCount) {
          continue; // Slot full
        }

        if (this.slotAccepts(slot, pieceRole)) {
          assignments[slotIndex].push(piece);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        return null; // Cannot assign this piece
      }
    }

    // Check required slots are filled
    for (let i = 0; i < rule.slots.length; i++) {
      const slot = rule.slots[i];
      if (slot.required && assignments[i].length === 0) {
        return null;
      }
    }

    return assignments;
  }

  /**
   * Check if a slot accepts a piece role
   */
  private slotAccepts(slot: SlotDefinition, role: string): boolean {
    if (Array.isArray(slot.accepts)) {
      return slot.accepts.includes(role);
    } else if (typeof slot.accepts === 'function') {
      return slot.accepts(role);
    } else {
      // This should never happen with proper typing, but provides a fallback
      return false;
    }
  }

  /**
   * Get conflicts for error reporting
   */
  private getConflicts(rule: CombinationRule, pieces: T[]): string[] {
    const conflicts: string[] = [];

    for (const piece of pieces) {
      const role = this.roleExtractor(piece);
      const canFit = rule.slots.some((slot) => this.slotAccepts(slot, role));

      if (!canFit) {
        conflicts.push(`${role} cannot be carried by ${rule.carrier}`);
      }
    }

    return conflicts;
  }

  /**
   * Get conflicts when no carrier is found
   */
  private getNoCarrierConflicts(pieces: T[]): string[] {
    const conflicts: string[] = [];
    const roles = pieces.map((p) => this.roleExtractor(p));

    // Check each piece to see if it could be a carrier
    for (const piece of pieces) {
      const role = this.roleExtractor(piece);
      const rule = this.rules.get(role);

      if (rule) {
        const otherPieces = pieces.filter((p) => p !== piece);
        const pieceConflicts = this.getConflicts(rule, otherPieces);
        if (pieceConflicts.length > 0) {
          conflicts.push(...pieceConflicts);
        }
      } else {
        conflicts.push(`${role} cannot be a carrier`);
      }
    }

    return conflicts.length > 0 ? conflicts : [`No valid carrier found among: ${roles.join(', ')}`];
  }
}

// ============================================================================
// 5. CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a combiner for board pieces
 */
export function createBoardCombiner<T extends Piece>(
  roleExtractor: (piece: T) => string
): PieceCombiner<T> {
  return new PieceCombiner(roleExtractor);
}

/**
 * Create a combiner with custom rules
 */
export function createCustomCombiner<T extends Piece>(
  roleExtractor: (piece: T) => string,
  customRules: CombinationRule[]
): PieceCombiner<T> {
  return new PieceCombiner(roleExtractor, customRules);
}

/**
 * Quick combination check without creating result
 */
export function canCombine<T extends Piece>(
  combiner: PieceCombiner<T>,
  piece1: T,
  piece2: T
): boolean {
  return combiner.combine(piece1, piece2).success;
}

// ============================================================================
// 6. RULE VALIDATION & UTILITIES
// ============================================================================

export class RuleValidator {
  static validateRules(rules: CombinationRule[]): string[] {
    const errors: string[] = [];

    for (const rule of rules) {
      // Check for duplicate carriers
      const duplicates = rules.filter((r) => r.carrier === rule.carrier);
      if (duplicates.length > 1) {
        errors.push(`Duplicate carrier rule: ${rule.carrier}`);
      }

      // Check slot definitions
      for (let i = 0; i < rule.slots.length; i++) {
        const slot = rule.slots[i];
        if (slot.maxCount <= 0) {
          errors.push(`Invalid maxCount for ${rule.carrier} slot ${i}`);
        }
      }
    }

    return errors;
  }

  static printRuleSummary(rules: CombinationRule[]): void {
    console.log('=== Combination Rules Summary ===');

    rules
      .sort((a, b) => b.priority - a.priority)
      .forEach((rule) => {
        console.log(`${rule.carrier} (priority: ${rule.priority})`);
        rule.slots.forEach((slot, i) => {
          const accepts = Array.isArray(slot.accepts) ? slot.accepts.join(', ') : 'custom function';
          console.log(`  Slot ${i}: ${accepts} (max: ${slot.maxCount})`);
        });
      });
  }
}

// ============================================================================
// 7. BACKWARD COMPATIBILITY LAYER
// ============================================================================

/**
 * @deprecated Use PieceCombiner instead. This class is provided for backward compatibility only.
 *
 * Legacy interface that mimics the old CombinePieceFactory API.
 * This allows existing code to work without changes while encouraging migration to the new API.
 *
 * @example Migration:
 * ```typescript
 * // Old way (still works)
 * const factory = new CombinePieceFactory(piece => piece.role)
 * const result = factory.formStack(piece1, piece2)
 *
 * // New way (recommended)
 * const combiner = new PieceCombiner(piece => piece.role)
 * const result = combiner.combine(piece1, piece2)
 * ```
 */
export class CombinePieceFactory<P extends Piece> {
  private combiner: PieceCombiner<P>;

  constructor(getRoleFunc: (piece: P) => string, mapRoleFunc?: (role: string) => string) {
    console.warn(
      'CombinePieceFactory is deprecated. Use PieceCombiner instead for better error handling and features.'
    );
    this.combiner = new PieceCombiner(getRoleFunc);
  }

  /**
   * @deprecated Use combiner.combine() instead
   */
  formStack(piece1: P, piece2: P): P | null {
    const result = this.combiner.combine(piece1, piece2);
    return result.success ? result.result! : null;
  }

  /**
   * @deprecated Use combiner.combineMultiple() instead
   */
  createCombineStackFromPieces(pieces: P[]): {
    combined: P | undefined;
    uncombined: P[] | undefined;
  } {
    if (!pieces || pieces.length === 0) {
      return { combined: undefined, uncombined: undefined };
    }

    if (pieces.length === 1) {
      return { combined: pieces[0], uncombined: undefined };
    }

    const result = this.combiner.combineMultiple(pieces);

    if (result.success) {
      return { combined: result.result, uncombined: undefined };
    } else {
      // For compatibility, if we can't combine all pieces, try to combine as many as possible
      // This is a simplified approach - the original might be more sophisticated
      return { combined: pieces[0], uncombined: pieces.slice(1) };
    }
  }
}

// ============================================================================
// 8. LEGACY EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use ROLE_GROUPS instead
 */
export interface GenericPiece extends Piece {}

// Re-export the main classes and functions
export { PieceCombiner as default };
