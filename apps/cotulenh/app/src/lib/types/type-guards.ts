/**
 * Type guards and safe type conversions for the CoTuLenh application.
 * These utilities help avoid dangerous type assertions and improve type safety.
 */

import type { Role } from '@cotulenh/board';
import type { PieceSymbol } from '@cotulenh/core';
import { ROLE_TO_SYMBOL, SYMBOL_TO_ROLE } from '@cotulenh/core';

/**
 * Checks if a value is a valid PieceSymbol
 */
export function isPieceSymbol(value: unknown): value is PieceSymbol {
  if (typeof value !== 'string') return false;
  const validSymbols = ['c', 'i', 't', 'm', 'e', 'a', 'g', 's', 'f', 'n', 'h'];
  return validSymbols.includes(value);
}

/**
 * Checks if a value is a valid Role
 */
export function isRole(value: unknown): value is Role {
  if (typeof value !== 'string') return false;
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
  return validRoles.includes(value);
}

/**
 * Safely converts a Role to PieceSymbol with runtime validation
 */
export function safeRoleToSymbol(role: unknown): PieceSymbol {
  if (!isRole(role)) {
    throw new TypeError(`Invalid role: ${role}`);
  }

  return ROLE_TO_SYMBOL[role];
}

/**
 * Safely converts a PieceSymbol to Role with runtime validation
 */
export function safeSymbolToRole(symbol: unknown): Role {
  if (!isPieceSymbol(symbol)) {
    throw new TypeError(`Invalid piece symbol: ${symbol}`);
  }

  return SYMBOL_TO_ROLE[symbol];
}

/**
 * Type guard for objects
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for ExtendedGame interface
 * Checks if the game instance has extended methods like isGameOver, isStalemate, isDraw
 */
export function hasExtendedGameMethods(
  game: unknown
): game is { isGameOver(): boolean; isStalemate?(): boolean; isDraw?(): boolean } {
  if (!isObject(game)) return false;
  return typeof (game as Record<string, unknown>).isGameOver === 'function';
}
