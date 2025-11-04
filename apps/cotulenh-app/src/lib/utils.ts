import {
  type DestMove,
  type OrigMove,
  type Role,
  type Piece as BoardPiece,
  type Color as BoardColor
} from '@repo/cotulenh-board';
import {
  type CoTuLenh,
  type Move,
  type Color as CoreColor,
  type Piece as CorePiece,
  type PieceSymbol,
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
// MAPPING LAYER: Translates between Core (game logic) and Board (UI) packages
// ============================================================================

/**
 * Maps Board Role (full names like 'commander') to Core PieceSymbol (single letters like 'c')
 */
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

/**
 * Maps Core PieceSymbol (single letters like 'c') to Board Role (full names like 'commander')
 */
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

/**
 * Converts Board Role to Core PieceSymbol
 * @param role - Board role (e.g., 'commander')
 * @returns Core piece symbol (e.g., 'c')
 */
export function roleToType(role: Role): PieceSymbol {
  return ROLE_TO_TYPE_MAP[role];
}

/**
 * Converts Core PieceSymbol to Board Role
 * @param type - Core piece symbol (e.g., 'c')
 * @returns Board role (e.g., 'commander')
 */
export function typeToRole(type: PieceSymbol): Role {
  return TYPE_TO_ROLE_MAP[type];
}

/**
 * Converts Board Color ('red', 'blue') to Core Color ('r', 'b')
 * @param color - Board color
 * @returns Core color
 */
export function boardColorToCore(color: BoardColor): CoreColor {
  return color === 'red' ? 'r' : 'b';
}

/**
 * Converts Core Color ('r', 'b') to Board Color ('red', 'blue')
 * @param color - Core color
 * @returns Board color
 */
export function coreColorToBoard(color: CoreColor): BoardColor {
  return color === 'r' ? 'red' : 'blue';
}

/**
 * Converts Board Piece to Core Piece
 * @param piece - Board piece with role and full color names
 * @returns Core piece with type symbol and short color codes
 */
export function boardPieceToCore(piece: BoardPiece): CorePiece {
  return {
    type: roleToType(piece.role),
    color: boardColorToCore(piece.color),
    heroic: piece.promoted,
    carrying: piece.carrying?.map(boardPieceToCore)
  };
}

/**
 * Converts Core Piece to Board Piece
 * @param piece - Core piece with type symbol and short color codes
 * @returns Board piece with role and full color names
 */
export function corePieceToBoard(piece: CorePiece): BoardPiece {
  return {
    role: typeToRole(piece.type),
    color: coreColorToBoard(piece.color),
    promoted: piece.heroic,
    carrying: piece.carrying?.map(corePieceToBoard)
  };
}

// ============================================================================
// GAME UTILITIES
// ============================================================================

/**
 * Calculates the possible destinations for each piece on the board for CoTuLenh.
 * @param game - The CoTuLenh game instance.
 * @returns A Map where keys are origin squares (e.g., 'e2') and values are arrays of destination squares (e.g., ['e3', 'e4']).
 */
export function getPossibleMoves(game: CoTuLenh): Move[] {
  return game.moves({ verbose: true }) as Move[];
}

/**
 * Gets the display name for the current turn color ('r' or 'b').
 * @param turn - The current turn ('r' or 'b').
 * @returns 'Red' or 'Blue'.
 */
export function getTurnColorName(turn: CoreColor): string {
  return turn === 'r' ? 'Red' : 'Blue';
}

export function makeCoreMove(game: CoTuLenh, orig: OrigMove, dest: DestMove): Move | null {
  try {
    const pieceAtSquare = game.get(orig.square);
    if (!pieceAtSquare) {
      throw new Error(`No piece at ${orig.square}`);
    }

    // For combined pieces, we need to determine which piece is actually moving
    let pieceToMove = pieceAtSquare;

    // If the user selected a specific piece type and it's different from the carrier
    if (orig.type && roleToType(orig.type) !== pieceAtSquare.type) {
      // Check if the selected type is in the carrying array
      const carriedPiece = pieceAtSquare.carrying?.find((p) => p.type === roleToType(orig.type));
      if (carriedPiece) {
        // Create a piece that represents moving the selected piece from the stack
        pieceToMove = {
          type: carriedPiece.type,
          color: carriedPiece.color,
          heroic: carriedPiece.heroic
        };
      }
    }

    // Check if there's an active deploy session
    const hasDeploySession = game.getDeployState() !== null;

    const moveResult = game.move({
      from: orig.square,
      to: dest.square,
      piece: pieceToMove.type,
      ...(dest.stay !== undefined && { stay: dest.stay }),
      deploy: hasDeploySession // Auto-detect deploy mode
    });
    return moveResult;
  } catch (error) {
    console.error('Error in makeCoreMove:', error);
    throw error;
  }
}
export function convertSetMapToArrayMap(map: Map<string, Set<string>>): Map<string, string[]> {
  return new Map(Array.from(map.entries()).map(([k, v]) => [k, Array.from(v)]));
}
