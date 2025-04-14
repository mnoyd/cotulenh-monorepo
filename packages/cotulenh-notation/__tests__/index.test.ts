import { CoTuLenh } from '@repo/cotulenh-core';
import { Key } from '@repo/cotulenh-board/types';
import { toDests, algebraicToNumeric } from '../src/index';

describe('toDests', () => {
  it('should return correct destinations for the initial position', () => {
    // Assuming default constructor sets up the initial board state
    const game = new CoTuLenh();

    const dests: Map<Key, Key[]> = toDests(game);


    expect(dests.get('1-1')).toHaveLength(11);

    //half of the pieces (all red pieces) have moves
    expect(dests.size).toBe(16);

  });

  // Placeholder for future tests with different board states
  it('should return correct destinations in a mid-game scenario', () => {
    // TODO: Add tests using FEN strings for specific scenarios
    // Example: const game = CoTuLenh.fromFen('...');
    // const dests = toDests(game);
    // expect(...).toEqual(...);
    expect(true).toBe(true); // Placeholder assertion
  });
});

// Add tests for algebraicToNumeric
describe('algebraicToNumeric', () => {
  it('should convert valid algebraic squares to numeric coordinates', () => {
    expect(algebraicToNumeric('a1')).toBe('0-0');
    expect(algebraicToNumeric('i10')).toBe('8-9');
    expect(algebraicToNumeric('e5')).toBe('4-4');
    expect(algebraicToNumeric('a10')).toBe('0-9');
    expect(algebraicToNumeric('i1')).toBe('8-0');
  });

  it('should return null for invalid algebraic squares', () => {
    // Invalid file
    expect(algebraicToNumeric('j13')).toBeNull();
    // Invalid rank (0)
    expect(algebraicToNumeric('a0')).toBeNull();
    // Invalid rank (11)
    expect(algebraicToNumeric('w11')).toBeNull();
    // Invalid format
    expect(algebraicToNumeric('aa1')).toBeNull();
    expect(algebraicToNumeric('a')).toBeNull();
    expect(algebraicToNumeric('1a')).toBeNull();
    expect(algebraicToNumeric('')).toBeNull();
  });
});
