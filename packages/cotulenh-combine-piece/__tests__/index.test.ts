import { formStack, GenericPiece } from '../src/index.js'; // Adjust path if needed

// --- Generic Piece Requirement (Assuming formStack needs at least an ID) ---
// If GenericPiece from '../src/index.js' has more requirements, adjust accordingly.
interface TestablePiece extends GenericPiece {
  id: string; // Assuming formStack or tests rely on an ID
  carrying?: TestablePiece[];
  // Other properties will vary based on the specific definition
}

// --- Piece Definition 1 -> Board Definition ---
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

export interface BoardPieceDefinition extends TestablePiece {
  role: BoardRole;
  color: BoardColor;
  promoted?: boolean;
  // 'carrying' inherited from TestablePiece
}
const getBoardRole = (piece: BoardPieceDefinition): string => piece.role;
const createBoardPiece = (
  role: BoardRole,
  idSuffix: string,
  color: BoardColor = 'red'
): BoardPieceDefinition => ({
  id: `${role[0]}${idSuffix}`, // Simple ID generation
  role: role,
  color: color
});

// --- Piece Definition 2 -> Core Definition ---
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

export interface CorePieceDefinition extends TestablePiece {
  color: CoreColor;
  type: CorePieceSymbol;
  // 'carrying' inherited from TestablePiece
  heroic?: boolean;
}

// Mapping needed because formStack likely uses role names internally
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
);

const getCoreRole = (piece: CorePieceDefinition): string => coreSymbolToRoleMap[piece.type];
const createCorePiece = (
  roleName: string,
  idSuffix: string,
  color: CoreColor = CORE_RED
): CorePieceDefinition => {
  const typeSymbol = coreRoleToSymbolMap[roleName];
  if (!typeSymbol) throw new Error(`Invalid role name for CorePieceDefinition: ${roleName}`);
  return {
    id: `${typeSymbol}${idSuffix}`, // Simple ID generation
    type: typeSymbol,
    color: color
  };
};

// --- Generic Test Suite ---
function runFormStackTests<T extends TestablePiece>(
  description: string,
  getRoleFn: (piece: T) => string,
  createPiece: (roleName: string, idSuffix: string, color?: any) => T
) {
  describe(description, () => {
    // Create test pieces using the appropriate helper
    const tank1 = createPiece('tank', '1');
    const infantry1 = createPiece('infantry', '1');
    const commander1 = createPiece('commander', '1');
    const artillery1 = createPiece('artillery', '1');
    const engineer1 = createPiece('engineer', '1');
    const navy1 = createPiece('navy', '1');
    const airforce1 = createPiece('air_force', '1');
    const headquarter1 = createPiece('headquarter', '1');
    const tank2 = createPiece('tank', '2'); // Second tank
    const tankWithInfantry = {
      ...createPiece('tank', 'ti'),
      carrying: [createPiece('infantry', 'ti')]
    };
    const engineerWithArtillery = {
      ...createPiece('engineer', 'ea'),
      carrying: [createPiece('artillery', 'ea')]
    };

    // --- Test Cases (using getRoleFn and pieces of type T) ---

    it('should stack infantry onto a tank', () => {
      const result = formStack(tank1, infantry1, getRoleFn);
      // Use expect.objectContaining to avoid matching irrelevant properties like color, type/role
      expect(result).toEqual(
        expect.objectContaining({
          ...tank1, // Spread the original carrier's relevant props (like id)
          carrying: [infantry1]
        })
      );
    });

    it('should stack commander onto a headquarter', () => {
      const result = formStack(headquarter1, commander1, getRoleFn);
      expect(result).toEqual(
        expect.objectContaining({
          ...headquarter1,
          carrying: [commander1]
        })
      );
    });

    it('should stack artillery onto an engineer', () => {
      const result = formStack(engineer1, artillery1, getRoleFn);
      expect(result).toEqual(
        expect.objectContaining({
          ...engineer1,
          carrying: [artillery1]
        })
      );
    });

    it('should stack tank and infantry onto airforce', () => {
      // Create a pre-stacked tank for this test case
      const localTankWithInfantry = {
        ...createPiece('tank', 'ti_af'), // Use unique ID suffix
        carrying: [createPiece('infantry', 'ti_af')]
      };
      const result = formStack(airforce1, localTankWithInfantry, getRoleFn);
      // Note: flattenStack extracts infantry1, so it's carrying directly by airforce1
      expect(result).toEqual(
        expect.objectContaining({
          ...airforce1,
          // Use arrayContaining because flattenStack might not preserve order relative to original carrier
          carrying: expect.arrayContaining([
            expect.objectContaining({ id: localTankWithInfantry.id }), // Match based on ID or other unique props
            expect.objectContaining({ id: localTankWithInfantry.carrying![0].id })
          ])
        })
      );
      expect(result?.carrying).toHaveLength(2);
    });

    it('should stack airforce and tank onto navy', () => {
      // Create a pre-stacked airforce for this test case
      const localAirforceWithTank = {
        ...createPiece('air_force', 'at_nv'), // Use unique ID suffix
        carrying: [createPiece('tank', 'at_nv')]
      };
      const result = formStack(navy1, localAirforceWithTank, getRoleFn);
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
      // Test stacking infantry onto tank
      const result1 = formStack(infantry1, tank1, getRoleFn);
      expect(result1).toEqual(
        expect.objectContaining({
          ...tank1, // Tank should be the carrier
          carrying: [infantry1]
        })
      );

      // Test stacking tank onto infantry (should still result in tank carrying infantry)
      const result2 = formStack(tank1, infantry1, getRoleFn);
      expect(result2).toEqual(
        expect.objectContaining({
          ...tank1, // Tank should be the carrier
          carrying: [infantry1]
        })
      );
    });

    it('should return null if a piece cannot fit (engineer carrying commander)', () => {
      const result = formStack(engineer1, commander1, getRoleFn);
      expect(result).toBeNull();
    });

    it('should return null if a slot is already filled with the same role (airforce carrying two tanks)', () => {
      // Create airforce already carrying one tank
      const airforceWithTank1 = { ...airforce1, carrying: [tank1] };
      const result = formStack(airforceWithTank1, tank2, getRoleFn);
      expect(result).toBeNull(); // Cannot carry two tanks
    });

    it('should correctly determine carrier when stacking two potential carriers (navy and airforce)', () => {
      // Navy can carry airforce
      const result = formStack(navy1, airforce1, getRoleFn);
      expect(result).toEqual(
        expect.objectContaining({
          ...navy1,
          carrying: [airforce1]
        })
      );
    });

    it('should correctly determine carrier when stacking two potential carriers (airforce and tank)', () => {
      // Airforce can carry tank
      const result = formStack(airforce1, tank1, getRoleFn);
      expect(result).toEqual(
        expect.objectContaining({
          ...airforce1,
          carrying: [tank1]
        })
      );
    });

    it('should return null when stacking two carriers where neither can carry the other (tank and engineer)', () => {
      const result = formStack(tank1, engineer1, getRoleFn);
      expect(result).toBeNull();
    });

    it('should handle pre-stacked pieces correctly', () => {
      // Create pieces specific to this test to avoid ID conflicts
      const localTankWithInfantry = {
        ...createPiece('tank', 'pi'),
        carrying: [createPiece('infantry', 'pi')]
      };
      const localEngineerWithArtillery = {
        ...createPiece('engineer', 'ea'),
        carrying: [createPiece('artillery', 'ea')]
      };

      // Try stacking engineer+artillery onto tank+infantry -> should fail (tank cannot carry engineer/artillery)
      const result1 = formStack(localTankWithInfantry, localEngineerWithArtillery, getRoleFn);
      expect(result1).toBeNull();

      // Try stacking tank+infantry onto airforce
      const airforceBase = createPiece('air_force', 'af_base');
      const result2 = formStack(airforceBase, localTankWithInfantry, getRoleFn);
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
      // Create pieces specific to this test, ensuring unique IDs if needed
      const navyComplex = createPiece('navy', 'cx_n');
      const airforceComplex = createPiece('air_force', 'cx_af');
      const tankComplex = createPiece('tank', 'cx_t');
      const engineerComplex = createPiece('engineer', 'cx_e');
      const artilleryComplex = createPiece('artillery', 'cx_a');

      const airforceWithTank: T = { ...airforceComplex, carrying: [tankComplex] };
      const engineerWithArtillery: T = { ...engineerComplex, carrying: [artilleryComplex] };

      // Stack engineer+artillery onto navy first -> should fail
      const navyWithEngineer = formStack(navyComplex, engineerWithArtillery, getRoleFn);
      expect(navyWithEngineer).toBeNull(); // Navy cannot carry engineer or artillery

      // Stack airforce+tank onto navy
      const navyWithAirforceAndTank = formStack(navyComplex, airforceWithTank, getRoleFn);
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

      // Now try to stack the engineer+artillery onto the navy+airforce+tank stack
      // This involves flattening everything: navy, airforce, tank, engineer, artillery
      // Navy should be carrier. Can carry airforce (slot 0), tank (slot 1). Cannot carry engineer or artillery.
      const finalStackAttempt = formStack(
        navyWithAirforceAndTank!,
        engineerWithArtillery,
        getRoleFn
      );
      expect(finalStackAttempt).toBeNull(); // Should fail because engineer/artillery cannot be carrying by navy
    });
  });
}

// --- Run Tests for Each Definition ---

runFormStackTests<BoardPieceDefinition>(
  'formStack with BoardPieceDefinition (role, color)',
  getBoardRole,
  createBoardPiece
);

runFormStackTests<CorePieceDefinition>(
  'formStack with CorePieceDefinition (type, color)',
  getCoreRole,
  createCorePiece
);
