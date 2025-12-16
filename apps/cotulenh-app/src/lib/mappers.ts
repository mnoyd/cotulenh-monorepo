import type { Role, Piece as BoardPiece, Color as BoardColor } from '@repo/cotulenh-board';
import type { Color as CoreColor, Piece as CorePiece, PieceSymbol } from '@repo/cotulenh-core';
import {
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

// ============================================================================
// MAPPING TABLES
// ============================================================================

const ROLE_TO_TYPE_MAP: Record<Role, PieceSymbol> = {
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

const TYPE_TO_ROLE_MAP: Record<PieceSymbol, Role> = {
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

// ============================================================================
// PIECE TYPE CONVERSIONS
// ============================================================================

export function roleToType(role: Role): PieceSymbol {
  return ROLE_TO_TYPE_MAP[role];
}

export function typeToRole(type: PieceSymbol): Role {
  return TYPE_TO_ROLE_MAP[type];
}

// ============================================================================
// COLOR CONVERSIONS
// ============================================================================

export function boardColorToCore(color: BoardColor): CoreColor {
  return color === 'red' ? 'r' : 'b';
}

export function coreColorToBoard(color: CoreColor): BoardColor {
  return color === 'r' ? 'red' : 'blue';
}

export function coreColorToBoardOrUndefined(color: CoreColor | null): BoardColor | undefined {
  return color ? coreColorToBoard(color) : undefined;
}

// ============================================================================
// PIECE CONVERSIONS
// ============================================================================

export function boardPieceToCore(piece: BoardPiece): CorePiece {
  return {
    type: roleToType(piece.role),
    color: boardColorToCore(piece.color),
    heroic: piece.promoted,
    carrying: piece.carrying?.map(boardPieceToCore)
  };
}

export function corePieceToBoard(piece: CorePiece): BoardPiece {
  return {
    role: typeToRole(piece.type),
    color: coreColorToBoard(piece.color),
    promoted: piece.heroic,
    carrying: piece.carrying?.map(corePieceToBoard)
  };
}
