// Test for CORE ENGINE - works with numbers only
import { describe, it, expect } from 'vitest';
import { StackEngine, ROLE_FLAGS } from '../src/index.js';

describe('StackEngine Core Logic', () => {
  const engine = new StackEngine();

  it('should return null for empty array', () => {
    const result = engine.lookup([]);
    expect(result).toBeNull();
  });

  it('should return null for too many pieces', () => {
    const result = engine.lookup([1, 2, 4, 8, 16]); // 5 pieces
    expect(result).toBeNull();
  });

  it('should return null for duplicate pieces', () => {
    const result = engine.lookup([64, 64]); // duplicate TANK
    expect(result).toBeNull();
  });

  it('should find valid single piece stack', () => {
    const result = engine.lookup([1]); // COMMANDER
    expect(result).not.toBeNull();
    expect(typeof result).toBe('bigint');
  });

  it('should find valid two piece stack', () => {
    const result = engine.lookup([64, 1]); // TANK + COMMANDER
    expect(result).not.toBeNull();
    expect(typeof result).toBe('bigint');
  });

  it('should find valid three piece stack', () => {
    const result = engine.lookup([128, 64, 1]); // AIR_FORCE + TANK + COMMANDER
    expect(result).not.toBeNull();
    expect(typeof result).toBe('bigint');
  });

  it('should return null for invalid combinations', () => {
    const result = engine.lookup([1, 2]); // COMMANDER + INFANTRY - no carrier
    expect(result).toBeNull();
  });

  it('should handle role flag constants', () => {
    const tankCommander = engine.lookup([ROLE_FLAGS.TANK, ROLE_FLAGS.COMMANDER]);
    expect(tankCommander).not.toBeNull();

    const invalidCombo = engine.lookup([ROLE_FLAGS.COMMANDER, ROLE_FLAGS.INFANTRY]);
    expect(invalidCombo).toBeNull();
  });

  it('should return consistent results for same input', () => {
    const pieces = [64, 1]; // TANK + COMMANDER
    const result1 = engine.lookup(pieces);
    const result2 = engine.lookup(pieces);
    expect(result1).toEqual(result2);
  });

  it('should handle order independence', () => {
    const result1 = engine.lookup([64, 1]); // TANK, COMMANDER
    const result2 = engine.lookup([1, 64]); // COMMANDER, TANK
    expect(result1).toEqual(result2);
  });
});
