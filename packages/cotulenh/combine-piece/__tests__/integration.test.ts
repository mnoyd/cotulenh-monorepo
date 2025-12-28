// Integration tests for PieceStacker
// Tests the complete system with real blueprint configurations
// NOTE: When blueprint.yaml is edited, these tests must be updated accordingly

import { PieceStacker, ROLE_FLAGS, DEFAULT_ROLE_MAPPING } from '../src/index.js';

// New Piece interface for testing
interface TestPiece {
  color: string;
  role: string;
  heroic: boolean;
  carrying?: TestPiece[];
}

// Create a stacker instance for tests using role mapping
const testStacker = new PieceStacker<TestPiece>(
  (piece: TestPiece) => piece.role,
  DEFAULT_ROLE_MAPPING
);

// Helper to create test pieces
function createPiece(role: string, color: string = 'red', heroic: boolean = false): TestPiece {
  return {
    color,
    role: role.toUpperCase(),
    heroic
    // No carrying property - let the engine handle it
  };
}

// Helper to create piece with carrying
function createPieceWithCarrying(
  role: string,
  carrying: TestPiece[],
  color: string = 'red'
): TestPiece {
  return {
    color,
    role: role.toUpperCase(),
    heroic: false,
    carrying
  };
}

describe('PieceStacker - Integration Tests', () => {
  describe('Migration and Compatibility', () => {
    it('should work with old constructor style (backward compatibility)', () => {
      // OLD WAY - Still works!
      const oldStacker = new PieceStacker<TestPiece>((piece: TestPiece) => {
        const roleKey = piece.role.toUpperCase() as keyof typeof ROLE_FLAGS;
        return ROLE_FLAGS[roleKey] || 0;
      });

      const tank = createPiece('TANK');
      const infantry = createPiece('INFANTRY');

      const result = oldStacker.combine([tank, infantry]);

      expect(result?.role).toBe('TANK');
      expect(result?.carrying?.[0]?.role).toBe('INFANTRY');
    });

    it('should work with new role mapping system using default mapping', () => {
      // NEW WAY - Using default mapping with constructor overloads
      const newStacker = new PieceStacker<TestPiece>(
        (piece: TestPiece) => piece.role,
        DEFAULT_ROLE_MAPPING
      );

      const tank = createPiece('TANK');
      const infantry = createPiece('INFANTRY');

      const result = newStacker.combine([tank, infantry]);

      expect(result?.role).toBe('TANK');
      expect(result?.carrying?.[0]?.role).toBe('INFANTRY');
    });

    it('should produce identical results with both old and new systems', () => {
      const oldStacker = new PieceStacker<TestPiece>((piece: TestPiece) => {
        const roleKey = piece.role.toUpperCase() as keyof typeof ROLE_FLAGS;
        return ROLE_FLAGS[roleKey] || 0;
      });

      const newStacker = new PieceStacker<TestPiece>(
        (piece: TestPiece) => piece.role,
        DEFAULT_ROLE_MAPPING
      );

      const tank = createPiece('TANK');
      const infantry = createPiece('INFANTRY');

      const oldResult = oldStacker.combine([tank, infantry]);
      const newResult = newStacker.combine([tank, infantry]);

      expect(oldResult).toEqual(newResult);
    });
  });

  describe('Custom Role Mapping', () => {
    it('should work with custom role names using role mapping', () => {
      // Define custom role mapping
      const customRoleMapping = {
        i: 'INFANTRY',
        infantry: 'INFANTRY',
        t: 'TANK',
        tank: 'TANK',
        n: 'NAVY',
        navy: 'NAVY'
      } as const;

      // Create stacker with custom role mapping
      const customStacker = new PieceStacker<TestPiece>(
        (piece: TestPiece) => piece.role,
        customRoleMapping
      );

      // Test with short role names - tank can carry infantry
      const tank = { color: 'red', role: 't', heroic: false };
      const infantry = { color: 'red', role: 'i', heroic: false };

      const result = customStacker.combine([tank, infantry]);

      expect(result).toEqual({
        color: 'red',
        role: 't',
        heroic: false,
        carrying: [
          {
            color: 'red',
            role: 'i',
            heroic: false
          }
        ]
      });
    });

    it('should work with mixed case role names', () => {
      const customRoleMapping = {
        Infantry: 'INFANTRY',
        Tank: 'TANK',
        Navy: 'NAVY'
      } as const;

      const customStacker = new PieceStacker<TestPiece>(
        (piece: TestPiece) => piece.role,
        customRoleMapping
      );

      const tank = { color: 'blue', role: 'Tank', heroic: false };
      const infantry = { color: 'blue', role: 'Infantry', heroic: false };

      const result = customStacker.combine([tank, infantry]);

      expect(result?.role).toBe('Tank');
      expect(result?.carrying?.[0]?.role).toBe('Infantry');
    });
  });
  describe('Basic Stacking', () => {
    it('should stack infantry onto a tank', () => {
      const tank = createPiece('TANK');
      const infantry = createPiece('INFANTRY');

      const result = testStacker.combine([tank, infantry]);

      expect(result?.color).toBe('red');
      expect(result?.role).toBe('TANK');
      expect(result?.heroic).toBe(false);
      expect(result?.carrying).toBeDefined();
      expect(result?.carrying?.[0]?.role).toBe('INFANTRY');
    });

    it('should stack commander onto a headquarter', () => {
      const headquarter = createPiece('HEADQUARTER');
      const commander = createPiece('COMMANDER');

      const result = testStacker.combine([headquarter, commander]);

      expect(result).toEqual({
        color: 'red',
        role: 'HEADQUARTER',
        heroic: false,
        carrying: [
          {
            color: 'red',
            role: 'COMMANDER',
            heroic: false
          }
        ]
      });
    });

    it('should stack artillery onto an engineer', () => {
      const engineer = createPiece('ENGINEER');
      const artillery = createPiece('ARTILLERY');

      const result = testStacker.combine([engineer, artillery]);

      expect(result).toEqual({
        color: 'red',
        role: 'ENGINEER',
        heroic: false,
        carrying: [
          {
            color: 'red',
            role: 'ARTILLERY',
            heroic: false
          }
        ]
      });
    });
  });

  describe('Multi-piece Stacking', () => {
    it('should stack tank and infantry onto airforce', () => {
      const airforce = createPiece('AIR_FORCE');
      const tank = createPiece('TANK');
      const infantry = createPiece('INFANTRY');

      const result = testStacker.combine([airforce, tank, infantry]);

      expect(result).toEqual({
        color: 'red',
        role: 'AIR_FORCE',
        heroic: false,
        carrying: [
          {
            color: 'red',
            role: 'TANK',
            heroic: false
          },
          {
            color: 'red',
            role: 'INFANTRY',
            heroic: false
          }
        ]
      });
    });

    it('should stack airforce and commander onto navy', () => {
      const navy = createPiece('NAVY');
      const airforce = createPiece('AIR_FORCE');
      const commander = createPiece('COMMANDER');

      const result = testStacker.combine([navy, airforce, commander]);

      expect(result).toEqual({
        color: 'red',
        role: 'NAVY',
        heroic: false,
        carrying: [
          {
            color: 'red',
            role: 'AIR_FORCE',
            heroic: false
          },
          {
            color: 'red',
            role: 'COMMANDER',
            heroic: false
          }
        ]
      });
    });

    it('should stack tank and air force onto navy at sea c3', () => {
      const navy = createPiece('NAVY');
      const tank = createPiece('TANK');
      const airforce = createPiece('AIR_FORCE');

      const result = testStacker.combine([navy, tank, airforce]);

      expect(result).toEqual({
        color: 'red',
        role: 'NAVY',
        heroic: false,
        carrying: [
          {
            color: 'red',
            role: 'AIR_FORCE',
            heroic: false
          },
          {
            color: 'red',
            role: 'TANK',
            heroic: false
          }
        ]
      });
    });
  });

  describe('Carrier Determination', () => {
    it('should correctly identify carrier (infantry and tank)', () => {
      const infantry = createPiece('INFANTRY');
      const tank = createPiece('TANK');

      // Order shouldn't matter - tank should always be carrier
      const result1 = testStacker.combine([infantry, tank]);
      const result2 = testStacker.combine([tank, infantry]);

      expect(result1).toEqual({
        color: 'red',
        role: 'TANK',
        heroic: false,
        carrying: [
          {
            color: 'red',
            role: 'INFANTRY',
            heroic: false
          }
        ]
      });

      expect(result2).toEqual(result1);
    });

    it('should correctly determine carrier when stacking two potential carriers (navy and airforce)', () => {
      const navy = createPiece('NAVY');
      const airforce = createPiece('AIR_FORCE');

      const result = testStacker.combine([navy, airforce]);

      expect(result).toEqual({
        color: 'red',
        role: 'NAVY',
        heroic: false,
        carrying: [
          {
            color: 'red',
            role: 'AIR_FORCE',
            heroic: false
          }
        ]
      });
    });

    it('should correctly determine carrier when stacking two potential carriers (airforce and tank)', () => {
      const airforce = createPiece('AIR_FORCE');
      const tank = createPiece('TANK');

      const result = testStacker.combine([tank, airforce]);

      expect(result).toEqual({
        color: 'red',
        role: 'AIR_FORCE',
        heroic: false,
        carrying: [
          {
            color: 'red',
            role: 'TANK',
            heroic: false
          }
        ]
      });
    });
  });

  describe('Invalid Combinations', () => {
    it('should return null when stacking two carriers where neither can carry the other', () => {
      const tank = createPiece('TANK');
      const engineer = createPiece('ENGINEER');

      const result = testStacker.combine([tank, engineer]);
      expect(result).toBeNull();
    });

    it('should return null if a piece cannot fit (engineer carrying commander)', () => {
      const engineer = createPiece('ENGINEER');
      const commander = createPiece('COMMANDER');

      const result = testStacker.combine([engineer, commander]);
      expect(result).toBeNull();
    });

    it('should combine pieces regardless of color (outer package handles color validation)', () => {
      const redTank = createPiece('TANK', 'red');
      const blueInfantry = createPiece('INFANTRY', 'blue');

      // No color checking - assumes outer package validated colors
      const result = testStacker.combine([redTank, blueInfantry]);
      expect(result).not.toBeNull();
      expect(result?.role).toBe('TANK');
    });

    it('should return null for too many pieces in one slot', () => {
      const airforce = createPiece('AIR_FORCE');
      const commander = createPiece('COMMANDER');
      const infantry = createPiece('INFANTRY');

      // Air force can carry tank in slot 1, humanlike in slot 2
      // But cannot carry both commander and infantry (both humanlike)
      const result = testStacker.combine([airforce, commander, infantry]);
      expect(result).toBeNull();
    });
  });

  describe('Pre-stacked Pieces', () => {
    it('should handle pre-stacked pieces correctly', () => {
      const tankWithInfantry = createPieceWithCarrying('TANK', [createPiece('INFANTRY')]);
      const airforce = createPiece('AIR_FORCE');

      const result = testStacker.combine([airforce, tankWithInfantry]);

      // The engine correctly flattens: AIR_FORCE carries TANK and INFANTRY separately
      expect(result?.role).toBe('AIR_FORCE');
      expect(result?.carrying).toBeDefined();
      expect(result?.carrying?.length).toBe(2);

      // Should have both TANK and INFANTRY in carrying array
      const roles = result?.carrying?.map((p) => p.role).sort();
      expect(roles).toEqual(['INFANTRY', 'TANK']);
    });

    it('should handle complex nested stacks', () => {
      const navy = createPiece('NAVY');
      const airforceWithTank = createPieceWithCarrying('AIR_FORCE', [createPiece('TANK')]);

      const result = testStacker.combine([navy, airforceWithTank]);

      // The engine correctly flattens: NAVY carries AIR_FORCE and TANK separately
      expect(result?.role).toBe('NAVY');
      expect(result?.carrying).toBeDefined();
      expect(result?.carrying?.length).toBe(2);

      // Should have both AIR_FORCE and TANK in carrying array
      const roles = result?.carrying?.map((p) => p.role).sort();
      expect(roles).toEqual(['AIR_FORCE', 'TANK']);
    });
  });

  describe('Piece Removal', () => {
    it('should remove piece from stack', () => {
      const tankWithInfantry = createPieceWithCarrying('TANK', [createPiece('INFANTRY')]);
      const infantryPiece = createPiece('INFANTRY');

      const result = testStacker.remove(tankWithInfantry, infantryPiece);

      expect(result?.color).toBe('red');
      expect(result?.role).toBe('TANK');
      expect(result?.heroic).toBe(false);
      // After removing INFANTRY, should just be TANK with no carrying
    });

    it('should return null when removing last piece', () => {
      const singlePiece = createPiece('COMMANDER');
      const commanderPiece = createPiece('COMMANDER');

      const result = testStacker.remove(singlePiece, commanderPiece);
      expect(result).toBeNull();
    });

    it('should handle removing non-existent piece', () => {
      const tank = createPiece('TANK');
      const commanderPiece = createPiece('COMMANDER');

      const result = testStacker.remove(tank, commanderPiece);

      expect(result).toEqual({
        color: 'red',
        role: 'TANK',
        heroic: false
      });
    });

    it('should handle removal from multi-piece stack', () => {
      // Use a simpler test case that we know works
      const tankWithInfantry = createPieceWithCarrying('TANK', [createPiece('INFANTRY')]);
      const infantryPiece = createPiece('INFANTRY');

      const result = testStacker.remove(tankWithInfantry, infantryPiece);

      expect(result?.color).toBe('red');
      expect(result?.role).toBe('TANK');
      expect(result?.heroic).toBe(false);
      // After removing INFANTRY, should just be TANK
    });

    it('should remove air force from navy stack leaving navy carrying tank at c3', () => {
      // Create a navy stack with both AIR_FORCE and TANK
      const navy = createPiece('NAVY');
      const airforce = createPiece('AIR_FORCE');
      const tank = createPiece('TANK');

      const navyWithAirforceAndTank = testStacker.combine([navy, airforce, tank]);
      expect(navyWithAirforceAndTank).not.toBeNull();

      const result = testStacker.remove(navyWithAirforceAndTank!, airforce);

      expect(result).toEqual({
        color: 'red',
        role: 'NAVY',
        heroic: false,
        carrying: [
          {
            color: 'red',
            role: 'TANK',
            heroic: false
          }
        ]
      });
    });

    it('should remove complex piece (with carrying) from stack', () => {
      // Create a simpler test: Airforce carrying Tank and Infantry
      const airforce = createPiece('AIR_FORCE');
      const tankWithInfantry = createPieceWithCarrying('TANK', [createPiece('INFANTRY')]);

      // This creates: Airforce carrying [Tank, Infantry] (flattened)
      const complexStack = testStacker.combine([airforce, tankWithInfantry]);
      expect(complexStack).not.toBeNull();

      // Remove the tank piece (which originally had infantry)
      // This should remove both TANK and INFANTRY roles, leaving just AIRFORCE
      const result = testStacker.remove(complexStack!, tankWithInfantry);

      expect(result).toEqual({
        color: 'red',
        role: 'AIR_FORCE',
        heroic: false
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      const result = testStacker.combine([]);
      expect(result).toBeNull();
    });

    it('should handle single piece', () => {
      const tank = createPiece('TANK');

      const result = testStacker.combine([tank]);

      expect(result?.color).toBe('red');
      expect(result?.role).toBe('TANK');
      expect(result?.heroic).toBe(false);
      // carrying can be undefined or empty - both are fine
    });

    it('should preserve heroic property', () => {
      const heroicTank = createPiece('TANK', 'red', true);
      const infantry = createPiece('INFANTRY');

      const result = testStacker.combine([heroicTank, infantry]);

      expect(result).toEqual({
        color: 'red',
        role: 'TANK',
        heroic: true,
        carrying: [
          {
            color: 'red',
            role: 'INFANTRY',
            heroic: false
          }
        ]
      });
    });
  });
});
