import {
  type DestMove,
  type OrigMove,
  type Role,
  type Piece as BoardPiece,
  type Color as BoardColor
} from '@repo/cotulenh-board';
import {
  type CoTuLenh,
  StandardMove as Move,
  type MoveResult,
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
import { createError, ErrorCode, logger } from '@repo/cotulenh-common';

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
 * @deprecated Use getMovesForSquare() for better performance (lazy loading)
 * @param game - The CoTuLenh game instance.
 * @returns A Map where keys are origin squares (e.g., 'e2') and values are arrays of destination squares (e.g., ['e3', 'e4']).
 */
export function getPossibleMoves(game: CoTuLenh): Move[] {
  return game.moves({ verbose: true }) as Move[];
}

/**
 * Gets possible moves for a specific square only (lazy loading - RECOMMENDED).
 * This follows the chess.js standard pattern and is much faster than generating all moves.
 * @param game - The CoTuLenh game instance
 * @param square - The square to get moves for (e.g., 'e2')
 * @returns Array of verbose move objects from that square
 */
export function getMovesForSquare(game: CoTuLenh, square: string): Move[] {
  return game.moves({ verbose: true, square }) as Move[];
}

/**
 * Gets all squares that have pieces which can move (without computing full move details).
 * This is very fast and useful for highlighting clickable pieces.
 * @param game - The CoTuLenh game instance
 * @returns Array of squares that have movable pieces
 */
export function getMovableSquares(game: CoTuLenh): string[] {
  const moves = game.moves({ verbose: false }) as string[];
  const squares = new Set<string>();

  // Parse move strings to extract origin squares
  // CoTuLenh uses SAN format, need to extract the 'from' square
  // For now, use verbose mode but only extract 'from' squares
  const verboseMoves = game.moves({ verbose: true }) as Move[];
  for (const move of verboseMoves) {
    squares.add(move.from);
  }

  return Array.from(squares);
}

/**
 * Gets the display name for the current turn color ('r' or 'b').
 * @param turn - The current turn ('r' or 'b').
 * @returns 'Red' or 'Blue'.
 */
export function getTurnColorName(turn: CoreColor): string {
  return turn === 'r' ? 'Red' : 'Blue';
}

export function makeCoreMove(game: CoTuLenh, orig: OrigMove, dest: DestMove): MoveResult | null {
  try {
    const pieceAtSquare = game.get(orig.square);
    if (!pieceAtSquare) {
      throw createError(ErrorCode.MOVE_PIECE_NOT_FOUND, `No piece at ${orig.square}`, {
        square: orig.square
      });
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

    // Check if it is a deploy move:
    // 1. Session is already active (continuation)
    // 2. OR explicit stack move indicated by board (start of new deploy)
    const isDeploy = !!game.getSession() || !!orig.stackMove;

    const moveResult = game.move({
      from: orig.square,
      to: dest.square,
      piece: pieceToMove.type,
      ...(dest.stay !== undefined && { stay: dest.stay }),
      deploy: isDeploy
    });
    return moveResult;
  } catch (error) {
    logger.error(error, 'Error in makeCoreMove:');
    throw error;
  }
}
export function convertSetMapToArrayMap(map: Map<string, Set<string>>): Map<string, string[]> {
  return new Map(Array.from(map.entries()).map(([k, v]) => [k, Array.from(v)]));
}
