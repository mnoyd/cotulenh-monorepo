import { describe, it, expect } from 'vitest';
import { PieceCombiner, Piece } from '../src/index.js';

// Define test types locally (since we can't import from the original test file)
export const boardColors = ['red', 'blue'] as const;
export type BoardColor = (typeof boardColors)[number];
export const boardRoles: string[] = [
  'commander',
  'infantry',
  'tank',
  'militia',
  'engineer',
  'artillery',
  'anti_air',
  'missile',
  'air_force',
  'navy',
  'headquarter'
] as const;
export type BoardRole = (typeof boardRoles)[number];

export const CORE_RED = 'r';
export const CORE_BLUE = 'b';
export type CoreColor = typeof CORE_RED | typeof CORE_BLUE;

export const CORE_COMMANDER = 'c';
export const CORE_INFANTRY = 'i';
export const CORE_TANK = 't';
export const CORE_MILITIA = 'm';
export const CORE_ENGINEER = 'e';
export const CORE_ARTILLERY = 'a';
export const CORE_ANTI_AIR = 'g';
export const CORE_MISSILE = 's';
export const CORE_AIR_FORCE = 'f';
export const CORE_NAVY = 'n';
export const CORE_HEADQUARTER = 'h';
export type CorePieceSymbol =
  | typeof CORE_COMMANDER
  | typeof CORE_INFANTRY
  | typeof CORE_TANK
  | typeof CORE_MILITIA
  | typeof CORE_ENGINEER
  | typeof CORE_ARTILLERY
  | typeof CORE_ANTI_AIR
  | typeof CORE_MISSILE
  | typeof CORE_AIR_FORCE
  | typeof CORE_NAVY
  | typeof CORE_HEADQUARTER;

export interface BoardPieceDefinition extends Piece {
  role: BoardRole;
  color: BoardColor;
  promoted?: boolean;
}

export interface CorePieceDefinition extends Piece {
  color: CoreColor;
  type: CorePieceSymbol;
  heroic?: boolean;
}

// Create a compatibility wrapper that mimics the original CombinePieceFactory interface
class CompatibilityWrapper<P extends Piece> {
  private combiner: PieceCombiner<P>;

  constructor(getRoleFunc: (piece: P) => string, mapRoleFunc?: (role: string) => string) {
    this.combiner = new PieceCombiner(getRoleFunc);
  }

  /**
   * Mimics the original formStack method
   */
  formStack(piece1: P, piece2: P): P | null {
    const result = this.combiner.combine(piece1, piece2);
    return result.success ? result.result! : null;
  }

  /**
   * Mimics the original createCombineStackFromPieces method
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

// Helper functions from original tests
const getBoardRole = (piece: BoardPieceDefinition): string => piece.role;
const createBoardPiece = (
  role: BoardRole,
  idSuffix: string,
  color: BoardColor = 'red'
): BoardPieceDefinition => ({
  id: `${role[0]}${idSuffix}`,
  role: role,
  color: color
});

// Core piece mapping
const coreSymbolToRoleMap: Record<CorePieceSymbol, string> = {
  [CORE_COMMANDER]: 'commander',
  [CORE_INFANTRY]: 'infantry',
  [CORE_TANK]: 'tank',
  [CORE_MILITIA]: 'militia',
  [CORE_ENGINEER]: 'engineer',
  [CORE_ARTILLERY]: 'artillery',
  [CORE_ANTI_AIR]: 'anti_air',
  [CORE_MISSILE]: 'missile',
  [CORE_AIR_FORCE]: 'air_force',
  [CORE_NAVY]: 'navy',
  [CORE_HEADQUARTER]: 'headquarter'
};

const coreRoleToSymbolMap: Record<string, CorePieceSymbol> = Object.fromEntries(
  Object.entries(coreSymbolToRoleMap).map(([symbol, role]) => [role, symbol as CorePieceSymbol])
) as Record<string, CorePieceSymbol>;

const getCoreRole = (piece: CorePieceDefinition): string => coreSymbolToRoleMap[piece.type];
const createCorePiece = (
  roleName: string,
  idSuffix: string,
  color: CoreColor = CORE_RED
): CorePieceDefinition => {
  const typeSymbol = coreRoleToSymbolMap[roleName];
  if (!typeSymbol) throw new Error(`Invalid role name for CorePieceDefinition: ${roleName}`);
  return {
    id: `${typeSymbol}${idSuffix}`,
    type: typeSymbol,
    color: color,
    role: roleName
  };
};

// Generic test suite using the compatibility wrapper
function runCompatibilityTests<T extends Piece>(
  description: string,
  getRoleFn: (piece: T) => string,
  createPiece: (roleName: string, idSuffix: string, color?: any) => T
) {
  describe(description, () => {
    // Create a factory instance using the compatibility wrapper
    const factory = new CompatibilityWrapper<T>(getRoleFn);

    // Create test pieces using the appropriate helper
    const tank1 = createPiece('tank', '1');
    const infantry1 = createPiece('infantry', '1');
    const commander1 = createPiece('commander', '1');
    const artillery1 = createPiece('artillery', '1');
    const engineer1 = createPiece('engineer', '1');
    const navy1 = createPiece('navy', '1');
    const airforce1 = createPiece('air_force', '1');
    const headquarter1 = createPiece('headquarter', '1');
    const tank2 = createPiece('tank', '2');

    // All the original test cases
    it('should stack infantry onto a tank', () => {
      const result = factory.formStack(tank1, infantry1);
      expect(result).toEqual(
        expect.objectContaining({
          ...tank1,
          carrying: [infantry1]
        })
      );
    });

    it('should stack commander onto a headquarter', () => {
      const result = factory.formStack(headquarter1, commander1);
      expect(result).toEqual(
        expect.objectContaining({
          ...headquarter1,
          carrying: [commander1]
        })
      );
    });

    it('should stack artillery onto an engineer', () => {
      const result = factory.formStack(engineer1, artillery1);
      expect(result).toEqual(
        expect.objectContaining({
          ...engineer1,
          carrying: [artillery1]
        })
      );
    });

    it('should stack tank and infantry onto airforce', () => {
      const localTankWithInfantry = {
        ...createPiece('tank', 'ti_af'),
        carrying: [createPiece('infantry', 'ti_af')]
      };
      const result = factory.formStack(airforce1, localTankWithInfantry);
      expect(result).toEqual(
        expect.objectContaining({
          ...airforce1,
          carrying: expect.arrayContaining([
            expect.objectContaining({ id: localTankWithInfantry.id }),
            expect.objectContaining({ id: localTankWithInfantry.carrying![0].id })
          ])
        })
      );
      expect(result?.carrying).toHaveLength(2);
    });

    it('should stack airforce and tank onto navy', () => {
      const localAirforceWithTank = {
        ...createPiece('air_force', 'at_nv'),
        carrying: [createPiece('tank', 'at_nv')]
      };
      const result = factory.formStack(navy1, localAirforceWithTank);
      expect(result).toEqual(
        expect.objectContaining({
          ...navy1,
          carrying: expect.arrayContaining([
            expect.objectContaining({ id: localAirforceWithTank.id }),
            expect.objectContaining({ id: localAirforceWithTank.carrying![0].id })
          ])
        })
      );
      expect(result?.carrying).toHaveLength(2);
    });

    it('should correctly identify carrier and stack (infantry and tank)', () => {
      const result1 = factory.formStack(infantry1, tank1);
      expect(result1).toEqual(
        expect.objectContaining({
          ...tank1,
          carrying: [infantry1]
        })
      );

      const result2 = factory.formStack(tank1, infantry1);
      expect(result2).toEqual(
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

      const withCommander = factory.formStack(airforce, commander);
      const result = withCommander ? factory.formStack(withCommander, infantry) : null;
      expect(result).toBeNull();

      const withInfantry = factory.formStack(airforce, infantry);
      const result2 = withInfantry ? factory.formStack(withInfantry, commander) : null;
      expect(result2).toBeNull();
    });

    it('should fail to add artillery to an engineer already carrying anti_air', () => {
      const engineerWithAntiAir = {
        ...createPiece('engineer', 'ea_aa'),
        carrying: [createPiece('anti_air', 'ea_aa')]
      };
      const artillery = createPiece('artillery', 'ea_aa');
      const result = factory.formStack(engineerWithAntiAir, artillery);
      expect(result).toBeNull();
    });

    it('should return null if a piece cannot fit (engineer carrying commander)', () => {
      const result = factory.formStack(engineer1, commander1);
      expect(result).toBeNull();
    });

    it('should return null if a slot is already filled with the same role (airforce carrying two tanks)', () => {
      const airforceWithTank1 = { ...airforce1, carrying: [tank1] };
      const result = factory.formStack(airforceWithTank1, tank2);
      expect(result).toBeNull();
    });

    it('should correctly determine carrier when stacking two potential carriers (navy and airforce)', () => {
      const result = factory.formStack(navy1, airforce1);
      expect(result).toEqual(
        expect.objectContaining({
          ...navy1,
          carrying: [airforce1]
        })
      );
    });

    it('should correctly determine carrier when stacking two potential carriers (airforce and tank)', () => {
      const result = factory.formStack(airforce1, tank1);
      expect(result).toEqual(
        expect.objectContaining({
          ...airforce1,
          carrying: [tank1]
        })
      );
    });

    it('should return null when stacking two carriers where neither can carry the other (tank and engineer)', () => {
      const result = factory.formStack(tank1, engineer1);
      expect(result).toBeNull();
    });

    it('should handle pre-stacked pieces correctly', () => {
      const localTankWithInfantry = {
        ...createPiece('tank', 'pi'),
        carrying: [createPiece('infantry', 'pi')]
      };
      const localEngineerWithArtillery = {
        ...createPiece('engineer', 'ea'),
        carrying: [createPiece('artillery', 'ea')]
      };

      const result1 = factory.formStack(localTankWithInfantry, localEngineerWithArtillery);
      expect(result1).toBeNull();

      const airforceBase = createPiece('air_force', 'af_base');
      const result2 = factory.formStack(airforceBase, localTankWithInfantry);
      expect(result2).toEqual(
        expect.objectContaining({
          ...airforceBase,
          carrying: expect.arrayContaining([
            expect.objectContaining({ id: localTankWithInfantry.id }),
            expect.objectContaining({ id: localTankWithInfantry.carrying![0].id })
          ])
        })
      );
      expect(result2?.carrying).toHaveLength(2);
    });

    it('should handle complex stack flattening and carrier determination', () => {
      const navyComplex = createPiece('navy', 'cx_n');
      const airforceComplex = createPiece('air_force', 'cx_af');
      const tankComplex = createPiece('tank', 'cx_t');
      const engineerComplex = createPiece('engineer', 'cx_e');
      const artilleryComplex = createPiece('artillery', 'cx_a');

      const airforceWithTank: T = { ...airforceComplex, carrying: [tankComplex] };
      const engineerWithArtillery: T = { ...engineerComplex, carrying: [artilleryComplex] };

      const navyWithEngineer = factory.formStack(navyComplex, engineerWithArtillery);
      expect(navyWithEngineer).toBeNull();

      const navyWithAirforceAndTank = factory.formStack(navyComplex, airforceWithTank);
      expect(navyWithAirforceAndTank).toEqual(
        expect.objectContaining({
          ...navyComplex,
          carrying: expect.arrayContaining([
            expect.objectContaining({ id: airforceComplex.id }),
            expect.objectContaining({ id: tankComplex.id })
          ])
        })
      );
      expect(navyWithAirforceAndTank?.carrying).toHaveLength(2);

      const finalStackAttempt = factory.formStack(navyWithAirforceAndTank!, engineerWithArtillery);
      expect(finalStackAttempt).toBeNull();
    });
  });
}

// Run compatibility tests
runCompatibilityTests<BoardPieceDefinition>(
  'Compatibility Test with BoardPieceDefinition (Alternative Implementation)',
  getBoardRole,
  createBoardPiece
);

runCompatibilityTests<CorePieceDefinition>(
  'Compatibility Test with CorePieceDefinition (Alternative Implementation)',
  getCoreRole,
  createCorePiece
);
