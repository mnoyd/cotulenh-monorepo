import {
  origMoveToKey,
  roles,
  type Dests as BoardDest,
  type DestMove,
  type OrigMove,
  type OrigMoveKey,
  type Role,
  type Piece as BoardPiece
} from '@repo/cotulenh-board';
import {
  type CoTuLenh,
  type Move,
  type Color,
  getRoleFromCoreType,
  getCoreTypeFromRole,
  type Piece as CorePiece
} from '@repo/cotulenh-core';

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
export function getTurnColorName(turn: Color): string {
  return turn === 'r' ? 'Red' : 'Blue';
}

export function makeCoreMove(game: CoTuLenh, orig: OrigMove, dest: DestMove): Move | null {
  try {
    const moveResult = game.move({
      from: orig.square,
      to: dest.square,
      ...(orig.type && { piece: getCoreTypeFromRole(orig.type) }),
      ...(dest.stay !== undefined && { stay: dest.stay }),
      deploy: false
    });
    return moveResult;
  } catch (error) {
    throw error;
  }
}

export function convertBoardPieceToCorePiece(piece: BoardPiece): CorePiece {
  const type = getCoreTypeFromRole(piece.role);
  if (!type) {
    throw new Error(`Invalid piece type: ${piece.role}`);
  }
  const color = piece.color === 'red' ? 'r' : 'b';
  return {
    type,
    color,
    heroic: piece.promoted,
    carrying: piece.carrying?.map((p) => convertBoardPieceToCorePiece(p))
  };
}
