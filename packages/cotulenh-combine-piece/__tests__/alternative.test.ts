import { describe, it, expect, beforeEach } from 'vitest';
import { PieceCombiner, Piece, COMBINATION_RULES, RuleValidator } from '../src/index.js';

// Test piece interfaces matching the original tests
interface TestablePiece extends Piece {
  id: string;
  carrying?: TestablePiece[];
}

interface BoardPieceDefinition extends TestablePiece {
  role: string;
  color: string;
  promoted?: boolean;
}

interface CorePieceDefinition extends TestablePiece {
  color: string;
  type: string;
  heroic?: boolean;
}

// Helper functions
const getBoardRole = (piece: BoardPieceDefinition): string => piece.role;
const createBoardPiece = (
  role: string,
  idSuffix: string,
  color: string = 'red'
): BoardPieceDefinition => ({
  id: `${role[0]}${idSuffix}`,
  role: role,
  color: color
});

// Core piece mapping
const coreSymbolToRoleMap: Record<string, string> = {
  c: 'commander',
  i: 'infantry',
  t: 'tank',
  m: 'militia',
  e: 'engineer',
  a: 'artillery',
  g: 'anti_air',
  s: 'missile',
  f: 'air_force',
  n: 'navy',
  h: 'headquarter'
};

const coreRoleToSymbolMap: Record<string, string> = Object.fromEntries(
  Object.entries(coreSymbolToRoleMap).map(([symbol, role]) => [role, symbol])
);

const getCoreRole = (piece: CorePieceDefinition): string => coreSymbolToRoleMap[piece.type];
const createCorePiece = (
  roleName: string,
  idSuffix: string,
  color: string = 'r'
): CorePieceDefinition => {
  const typeSymbol = coreRoleToSymbolMap[roleName];
  if (!typeSymbol) throw new Error(`Invalid role name for CorePieceDefinition: ${roleName}`);
  return {
    id: `${typeSymbol}${idSuffix}`,
    type: typeSymbol,
    color: color,
    role: roleName // Add role for consistency
  };
};

// Generic test suite
function runAlternativeTests<T extends TestablePiece>(
  description: string,
  getRoleFn: (piece: T) => string,
  createPiece: (roleName: string, idSuffix: string, color?: any) => T
) {
  describe(description, () => {
    let combiner: PieceCombiner<T>;

    beforeEach(() => {
      combiner = new PieceCombiner<T>(getRoleFn);
    });

    // Create test pieces
    const tank1 = createPiece('tank', '1');
    const infantry1 = createPiece('infantry', '1');
    const commander1 = createPiece('commander', '1');
    const artillery1 = createPiece('artillery', '1');
    const engineer1 = createPiece('engineer', '1');
    const navy1 = createPiece('navy', '1');
    const airforce1 = createPiece('air_force', '1');
    const headquarter1 = createPiece('headquarter', '1');
    const tank2 = createPiece('tank', '2');

    it('should stack infantry onto a tank', () => {
      const result = combiner.combine(tank1, infantry1);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(
        expect.objectContaining({
          ...tank1,
          carrying: [infantry1]
        })
      );
    });

    it('should stack commander onto a headquarter', () => {
      const result = combiner.combine(headquarter1, commander1);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(
        expect.objectContaining({
          ...headquarter1,
          carrying: [commander1]
        })
      );
    });

    it('should stack artillery onto an engineer', () => {
      const result = combiner.combine(engineer1, artillery1);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(
        expect.objectContaining({
          ...engineer1,
          carrying: [artillery1]
        })
      );
    });

    it('should stack tank and infantry onto airforce', () => {
      const tankWithInfantry = {
        ...createPiece('tank', 'ti_af'),
        carrying: [createPiece('infantry', 'ti_af')]
      };
      const result = combiner.combine(airforce1, tankWithInfantry);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(
        expect.objectContaining({
          ...airforce1,
          carrying: expect.arrayContaining([
            expect.objectContaining({ id: tankWithInfantry.id }),
            expect.objectContaining({ id: tankWithInfantry.carrying![0].id })
          ])
        })
      );
      expect(result.result?.carrying).toHaveLength(2);
    });

    it('should stack airforce and tank onto navy', () => {
      const airforceWithTank = {
        ...createPiece('air_force', 'at_nv'),
        carrying: [createPiece('tank', 'at_nv')]
      };
      const result = combiner.combine(navy1, airforceWithTank);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(
        expect.objectContaining({
          ...navy1,
          carrying: expect.arrayContaining([
            expect.objectContaining({ id: airforceWithTank.id }),
            expect.objectContaining({ id: airforceWithTank.carrying![0].id })
          ])
        })
      );
      expect(result.result?.carrying).toHaveLength(2);
    });

    it('should correctly identify carrier and stack (infantry and tank)', () => {
      const result1 = combiner.combine(infantry1, tank1);
      expect(result1.success).toBe(true);
      expect(result1.result).toEqual(
        expect.objectContaining({
          ...tank1,
          carrying: [infantry1]
        })
      );

      const result2 = combiner.combine(tank1, infantry1);
      expect(result2.success).toBe(true);
      expect(result2.result).toEqual(
        expect.objectContaining({
          ...tank1,
          carrying: [infantry1]
        })
      );
    });

    it('should fail to add both commander and infantry to airforce', () => {
      const airforce = createPiece('air_force', 'f');
      const commander = createPiece('commander', 'c');
      const infantry = createPiece('infantry', 'i');

      // Try combining all three at once
      const result = combiner.combineMultiple([airforce, commander, infantry]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot fit all pieces');
    });

    it('should fail to add artillery to an engineer already carrying anti_air', () => {
      const engineerWithAntiAir = {
        ...createPiece('engineer', 'ea_aa'),
        carrying: [createPiece('anti_air', 'ea_aa')]
      };
      const artillery = createPiece('artillery', 'ea_aa');
      const result = combiner.combine(engineerWithAntiAir, artillery);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot fit all pieces');
    });

    it('should return error if a piece cannot fit (engineer carrying commander)', () => {
      const result = combiner.combine(engineer1, commander1);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.conflicts).toContain('commander cannot be carried by engineer');
    });

    it('should return error if a slot is already filled with the same role (airforce carrying two tanks)', () => {
      const airforceWithTank1 = { ...airforce1, carrying: [tank1] };
      const result = combiner.combine(airforceWithTank1, tank2);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot fit all pieces');
    });

    it('should correctly determine carrier when stacking two potential carriers (navy and airforce)', () => {
      const result = combiner.combine(navy1, airforce1);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(
        expect.objectContaining({
          ...navy1,
          carrying: [airforce1]
        })
      );
    });

    it('should correctly determine carrier when stacking two potential carriers (airforce and tank)', () => {
      const result = combiner.combine(airforce1, tank1);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(
        expect.objectContaining({
          ...airforce1,
          carrying: [tank1]
        })
      );
    });

    it('should return error when stacking two carriers where neither can carry the other (tank and engineer)', () => {
      const result = combiner.combine(tank1, engineer1);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle pre-stacked pieces correctly', () => {
      const tankWithInfantry = {
        ...createPiece('tank', 'pi'),
        carrying: [createPiece('infantry', 'pi')]
      };
      const engineerWithArtillery = {
        ...createPiece('engineer', 'ea'),
        carrying: [createPiece('artillery', 'ea')]
      };

      // Try stacking engineer+artillery onto tank+infantry -> should fail
      const result1 = combiner.combine(tankWithInfantry, engineerWithArtillery);
      expect(result1.success).toBe(false);

      // Try stacking tank+infantry onto airforce
      const airforceBase = createPiece('air_force', 'af_base');
      const result2 = combiner.combine(airforceBase, tankWithInfantry);
      expect(result2.success).toBe(true);
      expect(result2.result).toEqual(
        expect.objectContaining({
          ...airforceBase,
          carrying: expect.arrayContaining([
            expect.objectContaining({ id: tankWithInfantry.id }),
            expect.objectContaining({ id: tankWithInfantry.carrying![0].id })
          ])
        })
      );
      expect(result2.result?.carrying).toHaveLength(2);
    });

    it('should handle complex stack flattening and carrier determination', () => {
      const navyComplex = createPiece('navy', 'cx_n');
      const airforceComplex = createPiece('air_force', 'cx_af');
      const tankComplex = createPiece('tank', 'cx_t');
      const engineerComplex = createPiece('engineer', 'cx_e');
      const artilleryComplex = createPiece('artillery', 'cx_a');

      const airforceWithTank: T = { ...airforceComplex, carrying: [tankComplex] };
      const engineerWithArtillery: T = { ...engineerComplex, carrying: [artilleryComplex] };

      // Stack engineer+artillery onto navy first -> should fail
      const navyWithEngineer = combiner.combine(navyComplex, engineerWithArtillery);
      expect(navyWithEngineer.success).toBe(false);

      // Stack airforce+tank onto navy
      const navyWithAirforceAndTank = combiner.combine(navyComplex, airforceWithTank);
      expect(navyWithAirforceAndTank.success).toBe(true);
      expect(navyWithAirforceAndTank.result).toEqual(
        expect.objectContaining({
          ...navyComplex,
          carrying: expect.arrayContaining([
            expect.objectContaining({ id: airforceComplex.id }),
            expect.objectContaining({ id: tankComplex.id })
          ])
        })
      );
      expect(navyWithAirforceAndTank.result?.carrying).toHaveLength(2);

      // Now try to stack the engineer+artillery onto the navy+airforce+tank stack
      const finalStackAttempt = combiner.combine(
        navyWithAirforceAndTank.result!,
        engineerWithArtillery
      );
      expect(finalStackAttempt.success).toBe(false);
    });

    // Additional tests for new functionality
    it('should provide detailed error information', () => {
      const result = combiner.combine(tank1, artillery1);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.conflicts).toContain('artillery cannot be carried by tank');
    });

    it('should handle multiple piece combination', () => {
      const result = combiner.combineMultiple([navy1, airforce1, tank1]);
      expect(result.success).toBe(true);
      expect(result.result?.carrying).toHaveLength(2);
    });

    it('should handle different color pieces', () => {
      const blueTank = createPiece('tank', 'blue', 'blue');
      const result = combiner.combine(tank1, blueTank);
      expect(result.success).toBe(false);
      expect(result.error).toContain('different colors');
    });
  });
}

// Test rule validation
describe('Rule Validation', () => {
  it('should validate rules correctly', () => {
    const errors = RuleValidator.validateRules(COMBINATION_RULES);
    expect(errors).toHaveLength(0);
  });

  it('should detect duplicate carriers', () => {
    const badRules = [
      ...COMBINATION_RULES,
      {
        carrier: 'navy',
        priority: 50,
        slots: [{ accepts: ['test'], maxCount: 1 }]
      }
    ];
    const errors = RuleValidator.validateRules(badRules);
    expect(errors.some((e) => e.includes('Duplicate carrier'))).toBe(true);
  });
});

// Run tests for both piece types
runAlternativeTests<BoardPieceDefinition>(
  'Alternative Implementation with BoardPieceDefinition',
  getBoardRole,
  createBoardPiece
);

runAlternativeTests<CorePieceDefinition>(
  'Alternative Implementation with CorePieceDefinition',
  getCoreRole,
  createCorePiece
);
