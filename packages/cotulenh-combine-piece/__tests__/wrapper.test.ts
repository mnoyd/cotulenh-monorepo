// Test for wrapper functionality - simplified without complex mocking
import { describe, it, expect } from 'vitest';
import { PieceStacker, ROLE_FLAGS } from '../src/index.js';

interface TestPiece {
  color: string;
  role: string;
  heroic: boolean;
  carrying?: TestPiece[];
}

// Create a stacker instance for tests
const testStacker = new PieceStacker<TestPiece>((piece: TestPiece) => {
  const roleKey = piece.role.toUpperCase() as keyof typeof ROLE_FLAGS;
  return ROLE_FLAGS[roleKey] || 0;
});

describe('PieceStacker Wrapper - Helper Methods', () => {
  it('should handle nested pieces in remove operation', () => {
    // Test that remove operation correctly flattens nested pieces
    const nestedPiece: TestPiece = {
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

    // Remove the commander, should leave just the tank
    const result = testStacker.remove(nestedPiece, 'COMMANDER');

    expect(result?.color).toBe('red');
    expect(result?.role).toBe('TANK');
    expect(result?.heroic).toBe(false);
    // carrying can be undefined or empty - both are fine
  });

  it('should use role flags correctly', () => {
    // Test that the wrapper uses ROLE_FLAGS correctly
    const tank: TestPiece = { color: 'red', role: 'TANK', heroic: false };
    const commander: TestPiece = { color: 'red', role: 'COMMANDER', heroic: false };

    const result = testStacker.combine([tank, commander]);

    // Should successfully combine tank + commander
    expect(result).not.toBeNull();
    expect(result?.role).toBe('TANK');
    expect(result?.carrying?.[0]?.role).toBe('COMMANDER');
  });

  it('should handle empty pieces array', () => {
    const result = testStacker.combine([]);
    expect(result).toBeNull();
  });

  it('should combine pieces (no color checking - outer package handles this)', () => {
    const redPiece: TestPiece = { color: 'red', role: 'TANK', heroic: false };
    const bluePiece: TestPiece = { color: 'blue', role: 'COMMANDER', heroic: false };

    // No color checking - assumes outer package validated colors
    const result = testStacker.combine([redPiece, bluePiece]);
    expect(result).not.toBeNull();
    expect(result?.role).toBe('TANK');
  });

  it('should reject tank + infantry + commander (tank can only carry 1 piece)', () => {
    const tank: TestPiece = { color: 'red', role: 'TANK', heroic: false };
    const infantry: TestPiece = { color: 'red', role: 'INFANTRY', heroic: false };
    const commander: TestPiece = { color: 'red', role: 'COMMANDER', heroic: false };

    // TANK can only carry 1 piece, but we're trying to give it 2 (infantry + commander)
    const result = testStacker.combine([tank, infantry, commander]);
    expect(result).toBeNull();
  });

  it('should maintain piece properties in result', () => {
    const tankPiece: TestPiece = {
      color: 'red',
      role: 'TANK',
      heroic: true
    };

    const commanderPiece: TestPiece = {
      color: 'red',
      role: 'COMMANDER',
      heroic: false
    };

    const result = testStacker.combine([tankPiece, commanderPiece]);

    expect(result?.color).toBe('red');
    expect(result?.role).toBe('TANK');
    expect(result?.heroic).toBe(true);
    expect(result?.carrying?.[0]?.role).toBe('COMMANDER');
  });

  it('should handle remove operation correctly', () => {
    // Use a simple valid combination: TANK carrying COMMANDER
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

    const result = testStacker.remove(stackPiece, 'COMMANDER');

    expect(result?.color).toBe('red');
    expect(result?.role).toBe('TANK');
    expect(result?.heroic).toBe(false);
    // carrying can be undefined or empty - both are fine
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

    const result = testStacker.remove(stackPiece, 'COMMANDER');

    expect(result?.color).toBe('red');
    expect(result?.role).toBe('TANK');
    expect(result?.heroic).toBe(false);
    // carrying can be undefined or empty - both are fine
  });
});
