import { describe, it, expect } from 'vitest';
import {
  isPieceSymbol,
  isRole,
  safeRoleToSymbol,
  safeSymbolToRole,
  isObject,
  hasExtendedGameMethods
} from './type-guards';

describe('type-guards', () => {
  describe('isPieceSymbol', () => {
    it('should return true for valid piece symbols', () => {
      const validSymbols = ['c', 'i', 't', 'm', 'e', 'a', 'g', 's', 'f', 'n', 'h'];
      validSymbols.forEach((symbol) => {
        expect(isPieceSymbol(symbol)).toBe(true);
      });
    });

    it('should return false for invalid symbols', () => {
      expect(isPieceSymbol('x')).toBe(false);
      expect(isPieceSymbol('')).toBe(false);
      expect(isPieceSymbol(123)).toBe(false);
      expect(isPieceSymbol(null)).toBe(false);
      expect(isPieceSymbol(undefined)).toBe(false);
    });
  });

  describe('isRole', () => {
    it('should return true for valid roles', () => {
      const validRoles = [
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
      ];
      validRoles.forEach((role) => {
        expect(isRole(role)).toBe(true);
      });
    });

    it('should return false for invalid roles', () => {
      expect(isRole('invalid')).toBe(false);
      expect(isRole('')).toBe(false);
      expect(isRole(123)).toBe(false);
      expect(isRole(null)).toBe(false);
    });
  });

  describe('safeRoleToSymbol', () => {
    it('should convert valid role to symbol', () => {
      expect(safeRoleToSymbol('commander')).toBe('c');
      expect(safeRoleToSymbol('infantry')).toBe('i');
    });

    it('should throw error for invalid role', () => {
      expect(() => safeRoleToSymbol('invalid')).toThrow(TypeError);
      expect(() => safeRoleToSymbol(123)).toThrow(TypeError);
    });
  });

  describe('safeSymbolToRole', () => {
    it('should convert valid symbol to role', () => {
      expect(safeSymbolToRole('c')).toBe('commander');
      expect(safeSymbolToRole('i')).toBe('infantry');
    });

    it('should throw error for invalid symbol', () => {
      expect(() => safeSymbolToRole('x')).toThrow(TypeError);
      expect(() => safeSymbolToRole(123)).toThrow(TypeError);
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
    });
  });

  describe('hasExtendedGameMethods', () => {
    it('should return true for objects with isGameOver method', () => {
      const mockGame = {
        isGameOver: () => false,
        isStalemate: () => false,
        isDraw: () => false
      };
      expect(hasExtendedGameMethods(mockGame)).toBe(true);
    });

    it('should return false for objects without isGameOver method', () => {
      expect(hasExtendedGameMethods({})).toBe(false);
      expect(hasExtendedGameMethods({ isStalemate: () => false })).toBe(false);
      expect(hasExtendedGameMethods(null)).toBe(false);
      expect(hasExtendedGameMethods('string')).toBe(false);
    });
  });
});
