// Integration tests for PieceStacker
// Tests the complete system with real blueprint configurations
// NOTE: When blueprint.yaml is edited, these tests must be updated accordingly

import { PieceStacker } from '../src/index.js';

// New Piece interface for testing
interface TestPiece {
  color: string;
  role: string;
  heroic: boolean;
  carrying?: TestPiece[];
}

// Helper to create test pieces
function createPiece(role: string, color: string = 'red', heroic: boolean = false): TestPiece {
  return {
    color,
    role: role.toUpperCase(),
    heroic,
    carrying: []
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
  describe('Basic Stacking', () => {
    it('should stack infantry onto a tank', () => {
      const tank = createPiece('TANK');
      const infantry = createPiece('INFANTRY');

      const result = PieceStacker.combine([tank, infantry]);

      expect(result).toEqual({
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
    });

    it('should stack commander onto a headquarter', () => {
      const headquarter = createPiece('HEADQUARTER');
      const commander = createPiece('COMMANDER');

      const result = PieceStacker.combine([headquarter, commander]);

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

      const result = PieceStacker.combine([engineer, artillery]);

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

      const result = PieceStacker.combine([airforce, tank, infantry]);

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

      const result = PieceStacker.combine([navy, airforce, commander]);

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
  });

  describe('Carrier Determination', () => {
    it('should correctly identify carrier (infantry and tank)', () => {
      const infantry = createPiece('INFANTRY');
      const tank = createPiece('TANK');

      // Order shouldn't matter - tank should always be carrier
      const result1 = PieceStacker.combine([infantry, tank]);
      const result2 = PieceStacker.combine([tank, infantry]);

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

      const result = PieceStacker.combine([navy, airforce]);

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

      const result = PieceStacker.combine([tank, airforce]);

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

      const result = PieceStacker.combine([tank, engineer]);
      expect(result).toBeNull();
    });

    it('should return null if a piece cannot fit (engineer carrying commander)', () => {
      const engineer = createPiece('ENGINEER');
      const commander = createPiece('COMMANDER');

      const result = PieceStacker.combine([engineer, commander]);
      expect(result).toBeNull();
    });

    it('should return null for different colors', () => {
      const redTank = createPiece('TANK', 'red');
      const blueInfantry = createPiece('INFANTRY', 'blue');

      const result = PieceStacker.combine([redTank, blueInfantry]);
      expect(result).toBeNull();
    });

    it('should return null for too many pieces in one slot', () => {
      const airforce = createPiece('AIR_FORCE');
      const commander = createPiece('COMMANDER');
      const infantry = createPiece('INFANTRY');

      // Air force can carry tank in slot 1, humanlike in slot 2
      // But cannot carry both commander and infantry (both humanlike)
      const result = PieceStacker.combine([airforce, commander, infantry]);
      expect(result).toBeNull();
    });
  });

  describe('Pre-stacked Pieces', () => {
    it('should handle pre-stacked pieces correctly', () => {
      const tankWithInfantry = createPieceWithCarrying('TANK', [createPiece('INFANTRY')]);
      const airforce = createPiece('AIR_FORCE');

      const result = PieceStacker.combine([airforce, tankWithInfantry]);

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

    it('should handle complex nested stacks', () => {
      const navy = createPiece('NAVY');
      const airforceWithTank = createPieceWithCarrying('AIR_FORCE', [createPiece('TANK')]);

      const result = PieceStacker.combine([navy, airforceWithTank]);

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

  describe('Piece Removal', () => {
    it('should remove piece from stack', () => {
      const tankWithInfantry = createPieceWithCarrying('TANK', [createPiece('INFANTRY')]);

      const result = PieceStacker.remove(tankWithInfantry, 'INFANTRY');

      expect(result).toEqual({
        color: 'red',
        role: 'TANK',
        heroic: false
      });
    });

    it('should return null when removing last piece', () => {
      const singlePiece = createPiece('COMMANDER');

      const result = PieceStacker.remove(singlePiece, 'COMMANDER');
      expect(result).toBeNull();
    });

    it('should handle removing non-existent piece', () => {
      const tank = createPiece('TANK');

      const result = PieceStacker.remove(tank, 'COMMANDER');

      expect(result).toEqual({
        color: 'red',
        role: 'TANK',
        heroic: false
      });
    });

    it('should recombine remaining pieces after removal', () => {
      const navyWithAirforceAndCommander = createPieceWithCarrying('NAVY', [
        createPiece('AIR_FORCE'),
        createPiece('COMMANDER')
      ]);

      const result = PieceStacker.remove(navyWithAirforceAndCommander, 'AIR_FORCE');

      expect(result).toEqual({
        color: 'red',
        role: 'NAVY',
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
  });

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      const result = PieceStacker.combine([]);
      expect(result).toBeNull();
    });

    it('should handle single piece', () => {
      const tank = createPiece('TANK');

      const result = PieceStacker.combine([tank]);

      expect(result).toEqual({
        color: 'red',
        role: 'TANK',
        heroic: false,
        carrying: []
      });
    });

    it('should preserve heroic property', () => {
      const heroicTank = createPiece('TANK', 'red', true);
      const infantry = createPiece('INFANTRY');

      const result = PieceStacker.combine([heroicTank, infantry]);

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
