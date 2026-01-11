import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Type helpers for components (from shadcn-svelte)
export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

import { type DestMove, type OrigMove } from '@cotulenh/board';
import {
  type CoTuLenhInterface,
  MoveResult as Move,
  type MoveResult,
  type Color as CoreColor
} from '@cotulenh/core';
import { createError, ErrorCode, logger } from '@cotulenh/common';

// Import centralized translation functions
import {
  roleToType,
  typeToRole,
  boardColorToCore,
  coreColorToBoard,
  boardPieceToCore,
  corePieceToBoard
} from './types/translations';

// Re-export translation functions for backward compatibility
// New code should import directly from './types/translations'
export {
  roleToType,
  typeToRole,
  boardColorToCore,
  coreColorToBoard,
  boardPieceToCore,
  corePieceToBoard
};

// ============================================================================
// GAME UTILITIES
// ============================================================================

/**
 * Calculates the possible destinations for each piece on the board for CoTuLenh.
 * @deprecated Use getMovesForSquare() for better performance (lazy loading)
 * @param game - The CoTuLenh game instance.
 * @returns A Map where keys are origin squares (e.g., 'e2') and values are arrays of destination squares (e.g., ['e3', 'e4']).
 */
export function getPossibleMoves(game: CoTuLenhInterface): Move[] {
  return game.moves({ verbose: true }) as Move[];
}

/**
 * Gets possible moves for a specific square only (lazy loading - RECOMMENDED).
 * This follows the chess.js standard pattern and is much faster than generating all moves.
 * @param game - The CoTuLenh game instance
 * @param square - The square to get moves for (e.g., 'e2')
 * @returns Array of verbose move objects from that square
 */
export function getMovesForSquare(game: CoTuLenhInterface, square: string): Move[] {
  return game.moves({ verbose: true, square }) as Move[];
}

/**
 * Gets all squares that have pieces which can move (without computing full move details).
 * This is very fast and useful for highlighting clickable pieces.
 * @param game - The CoTuLenh game instance
 * @returns Array of squares that have movable pieces
 */
export function getMovableSquares(game: CoTuLenhInterface): string[] {
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

export function makeCoreMove(
  game: CoTuLenhInterface,
  orig: OrigMove,
  dest: DestMove
): MoveResult | null {
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
