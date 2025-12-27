/**
 * CENTRALIZED TYPE TRANSLATION LAYER
 *
 * This module provides all type conversions between:
 * - Core domain (game logic): PieceSymbol, Color ('r'/'b'), Piece
 * - Board domain (rendering): Role, Color ('red'/'blue'), Piece
 *
 * All cross-domain conversions should go through these functions.
 * This ensures consistency and makes refactoring easier.
 *
 * MAPPING REFERENCE:
 * Core        ↔ Board
 * =====================
 * PieceSymbol ↔ Role
 * 'r'/'b'     ↔ 'red'/'blue'
 * heroic      ↔ promoted
 */

import {
  type Piece as CorePiece,
  type PieceSymbol,
  type Color as CoreColor,
  COMMANDER,
  INFANTRY,
  TANK,
  MILITIA,
  ENGINEER,
  ARTILLERY,
  ANTI_AIR,
  MISSILE,
  AIR_FORCE,
  NAVY,
  HEADQUARTER
} from '@repo/cotulenh-core';

import {
  type Piece as BoardPiece,
  type Role,
  type Color as BoardColor
} from '@repo/cotulenh-board';

/**
 * ============================================================================
 * TYPE MAPPINGS: PieceSymbol ↔ Role
 * ============================================================================
 */

/** Maps Board Role (full names) to Core PieceSymbol (single letters) */
export const ROLE_TO_SYMBOL_MAP: Record<Role, PieceSymbol> = {
  commander: COMMANDER,
  infantry: INFANTRY,
  tank: TANK,
  militia: MILITIA,
  engineer: ENGINEER,
  artillery: ARTILLERY,
  anti_air: ANTI_AIR,
  missile: MISSILE,
  air_force: AIR_FORCE,
  navy: NAVY,
  headquarter: HEADQUARTER
};

/** Maps Core PieceSymbol (single letters) to Board Role (full names) */
export const SYMBOL_TO_ROLE_MAP: Record<PieceSymbol, Role> = {
  [COMMANDER]: 'commander',
  [INFANTRY]: 'infantry',
  [TANK]: 'tank',
  [MILITIA]: 'militia',
  [ENGINEER]: 'engineer',
  [ARTILLERY]: 'artillery',
  [ANTI_AIR]: 'anti_air',
  [MISSILE]: 'missile',
  [AIR_FORCE]: 'air_force',
  [NAVY]: 'navy',
  [HEADQUARTER]: 'headquarter'
};

/**
 * ============================================================================
 * COLOR CONVERSIONS: CoreColor ↔ BoardColor
 * ============================================================================
 */

/** Convert Board color ('red', 'blue') to Core color ('r', 'b') */
export function boardColorToCore(color: BoardColor): CoreColor {
  return color === 'red' ? 'r' : 'b';
}

/** Convert Core color ('r', 'b') to Board color ('red', 'blue') */
export function coreColorToBoard(color: CoreColor): BoardColor {
  return color === 'r' ? 'red' : 'blue';
}

/**
 * ============================================================================
 * PIECE TYPE CONVERSIONS: PieceSymbol ↔ Role
 * ============================================================================
 */

/**
 * Convert Board Role to Core PieceSymbol
 * @param role Board role (e.g., 'commander')
 * @returns Core piece symbol (e.g., 'c')
 */
export function roleToSymbol(role: Role): PieceSymbol {
  return ROLE_TO_SYMBOL_MAP[role];
}

/**
 * Convert Core PieceSymbol to Board Role
 * @param symbol Core piece symbol (e.g., 'c')
 * @returns Board role (e.g., 'commander')
 */
export function symbolToRole(symbol: PieceSymbol): Role {
  return SYMBOL_TO_ROLE_MAP[symbol];
}

/**
 * DEPRECATED: Use roleToSymbol instead
 * Kept for backward compatibility
 */
export function roleToType(role: Role): PieceSymbol {
  return roleToSymbol(role);
}

/**
 * DEPRECATED: Use symbolToRole instead
 * Kept for backward compatibility
 */
export function typeToRole(symbol: PieceSymbol): Role {
  return symbolToRole(symbol);
}

/**
 * ============================================================================
 * PIECE OBJECT CONVERSIONS: CorePiece ↔ BoardPiece
 * ============================================================================
 */

/**
 * Convert Board Piece to Core Piece
 * Recursively converts carrying array.
 *
 * Mappings:
 * - role (string) → type (symbol)
 * - color ('red'/'blue') → color ('r'/'b')
 * - promoted (bool) → heroic (bool)
 * - carrying (recursive) → carrying (recursive)
 *
 * @param piece Board piece with role and full color names
 * @returns Core piece with type symbol and short color codes
 */
export function boardPieceToCore(piece: BoardPiece): CorePiece {
  return {
    type: roleToSymbol(piece.role),
    color: boardColorToCore(piece.color),
    heroic: piece.promoted,
    carrying: piece.carrying?.map(boardPieceToCore)
  };
}

/**
 * Convert Core Piece to Board Piece
 * Recursively converts carrying array.
 *
 * Mappings:
 * - type (symbol) → role (string)
 * - color ('r'/'b') → color ('red'/'blue')
 * - heroic (bool) → promoted (bool)
 * - carrying (recursive) → carrying (recursive)
 *
 * @param piece Core piece with type symbol and short color codes
 * @returns Board piece with role and full color names
 */
export function corePieceToBoard(piece: CorePiece): BoardPiece {
  return {
    role: symbolToRole(piece.type),
    color: coreColorToBoard(piece.color),
    promoted: piece.heroic,
    carrying: piece.carrying?.map(corePieceToBoard)
  };
}

/**
 * ============================================================================
 * BATCH CONVERSIONS: For multiple pieces or special cases
 * ============================================================================
 */

/**
 * Convert a list of roles to symbols
 * @param roles Array of roles
 * @returns Array of symbols
 */
export function rolesToSymbols(roles: Role[]): PieceSymbol[] {
  return roles.map(roleToSymbol);
}

/**
 * Convert a list of symbols to roles
 * @param symbols Array of symbols
 * @returns Array of roles
 */
export function symbolsToRoles(symbols: PieceSymbol[]): Role[] {
  return symbols.map(symbolToRole);
}

/**
 * Convert a list of board pieces to core pieces
 * @param pieces Array of board pieces
 * @returns Array of core pieces
 */
export function boardPiecesToCore(pieces: BoardPiece[]): CorePiece[] {
  return pieces.map(boardPieceToCore);
}

/**
 * Convert a list of core pieces to board pieces
 * @param pieces Array of core pieces
 * @returns Array of board pieces
 */
export function corePiecesToBoard(pieces: CorePiece[]): BoardPiece[] {
  return pieces.map(corePieceToBoard);
}

/**
 * ============================================================================
 * VALIDATION HELPERS
 * ============================================================================
 */

/**
 * Check if a given value is a valid BoardColor
 */
export function isBoardColor(value: unknown): value is BoardColor {
  return typeof value === 'string' && (value === 'red' || value === 'blue');
}

/**
 * Check if a given value is a valid CoreColor
 */
export function isCoreColor(value: unknown): value is CoreColor {
  return typeof value === 'string' && (value === 'r' || value === 'b');
}

/**
 * Check if a given value is a valid Role
 */
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && value in ROLE_TO_SYMBOL_MAP;
}

/**
 * Check if a given value is a valid PieceSymbol
 */
export function isSymbol(value: unknown): value is PieceSymbol {
  return typeof value === 'string' && value in SYMBOL_TO_ROLE_MAP;
}
