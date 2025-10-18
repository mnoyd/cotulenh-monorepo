// Test for wrapper functionality - simplified without complex mocking
import { describe, it, expect } from 'vitest';
import { PieceStacker } from '../src/index.js';

interface TestPiece {
  color: string;
  role: string;
  heroic: boolean;
  carrying?: TestPiece[];
}

describe('PieceStacker Wrapper - Helper Methods', () => {
  it('should flatten nested pieces correctly', () => {
    const nestedPiece: TestPiece = {
      color: 'red',
      role: 'TANK',
      heroic: false,
      carrying: [
        {
          color: 'red',
          role: 'COMMANDER',
          heroic: true,
          carrying: [
            {
              color: 'red',
              role: 'INFANTRY',
              heroic: false
            }
          ]
        }
      ]
    };

    // Test the actual flatten method
    const flattened = (PieceStacker as any).flattenPieces([nestedPiece]);

    expect(flattened).toHaveLength(3);
    expect(flattened.map((p: TestPiece) => p.role)).toEqual(['TANK', 'COMMANDER', 'INFANTRY']);

    // Should not have carrying arrays in flattened pieces
    flattened.forEach((piece: TestPiece) => {
      expect(piece.carrying).toBeUndefined();
    });
  });

  it('should convert role names to numbers correctly', () => {
    const getRoleNumber = (PieceStacker as any).getRoleNumber;

    expect(getRoleNumber('COMMANDER')).toBe(1);
    expect(getRoleNumber('TANK')).toBe(64);
    expect(getRoleNumber('commander')).toBe(1); // lowercase
    expect(getRoleNumber('UNKNOWN')).toBe(0);
  });

  it('should handle empty pieces array', () => {
    const result = PieceStacker.combine([]);
    expect(result).toBeNull();
  });

  it('should reject different colors', () => {
    const redPiece = { color: 'red', role: 'TANK', heroic: false };
    const bluePiece = { color: 'blue', role: 'COMMANDER', heroic: false };

    const result = PieceStacker.combine([redPiece, bluePiece]);
    expect(result).toBeNull();
  });

  it('should reject tank + infantry + commander (tank can only carry 1 piece)', () => {
    const tank = { color: 'red', role: 'TANK', heroic: false };
    const infantry = { color: 'red', role: 'INFANTRY', heroic: false };
    const commander = { color: 'red', role: 'COMMANDER', heroic: false };

    // TANK can only carry 1 piece, but we're trying to give it 2 (infantry + commander)
    const result = PieceStacker.combine([tank, infantry, commander]);
    expect(result).toBeNull();
  });

  it('should maintain piece properties in result', () => {
    const tankPiece = {
      color: 'red',
      role: 'TANK',
      heroic: true
    };

    const commanderPiece = {
      color: 'red',
      role: 'COMMANDER',
      heroic: false
    };

    const result = PieceStacker.combine([tankPiece, commanderPiece]);

    expect(result).toEqual({
      color: 'red',
      role: 'TANK',
      heroic: true,
      carrying: [
        {
          color: 'red',
          role: 'COMMANDER',
          heroic: false
        }
      ]
    });
  });

  it('should handle remove operation correctly', () => {
    // Use AIR_FORCE which can carry multiple pieces
    const stackPiece = {
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
          role: 'COMMANDER',
          heroic: true
        }
      ]
    };

    const result = PieceStacker.remove(stackPiece, 'COMMANDER');

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

  it('should return single piece when only one remains', () => {
    const stackPiece = {
      color: 'red',
      role: 'TANK',
      heroic: false,
      carrying: [
        {
          color: 'red',
          role: 'COMMANDER',
          heroic: true
        }
      ]
    };

    const result = PieceStacker.remove(stackPiece, 'COMMANDER');

    expect(result).toEqual({
      color: 'red',
      role: 'TANK',
      heroic: false
    });
  });
});
