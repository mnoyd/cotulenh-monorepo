/**
 * Check and checkmate detection for CoTuLenh chess engine.
 *
 * This module implements commander tracking, attack detection, check detection,
 * and checkmate/stalemate detection using bitboard operations.
 */

import { lsb } from './bitboard';
import type { Color } from './types';
import { BitboardPosition } from './position';
import { generateAllMoves } from './move-generator';
import type { Move } from './move-generator';

/**
 * Finds the commander square for a specific color.
 *
 * @param position - The current position
 * @param color - The color of the commander to find
 * @returns The square index of the commander, or -1 if not found
 */
export function findCommanderSquare(position: BitboardPosition, color: Color): number {
  const commanderBitboard = position.getPiecesOfType('c', color);
  return lsb(commanderBitboard);
}

/**
 * Tracks commander positions for both colors.
 *
 * @param position - The current position
 * @returns Object with red and blue commander squares
 */
export function trackCommanderPositions(position: BitboardPosition): {
  red: number;
  blue: number;
} {
  return {
    red: findCommanderSquare(position, 'r'),
    blue: findCommanderSquare(position, 'b')
  };
}

/**
 * Updates commander position tracking when a commander moves.
 * This is a helper function for maintaining commander position state.
 *
 * @param _oldSquare - Previous square of the commander (unused, for API compatibility)
 * @param newSquare - New square of the commander
 * @param color - Color of the commander
 * @returns Object with updated commander position
 */
export function updateCommanderPosition(
  _oldSquare: number,
  newSquare: number,
  color: Color
): { square: number; color: Color } {
  return {
    square: newSquare,
    color
  };
}

/**
 * Checks if a square is attacked by a specific color using bitboard operations.
 *
 * This function generates all pseudo-legal moves for the attacking color and
 * checks if any of them target the specified square (either as a capture or
 * as a potential capture if a piece were there).
 *
 * @param position - The current position
 * @param square - The square to check for attacks
 * @param byColor - The color of the attacking pieces
 * @returns True if the square is attacked by the specified color
 */
export function isSquareAttacked(
  position: BitboardPosition,
  square: number,
  byColor: Color
): boolean {
  // Generate all moves for the attacking color
  const attackingMoves = generateAllMoves(position, byColor);

  // Check if any move targets this square
  // A square is attacked if:
  // 1. There's a capture move to that square, OR
  // 2. There's a normal move to that square (meaning a piece could capture there if something was there)
  for (const move of attackingMoves) {
    if (move.to === square) {
      return true;
    }
  }

  return false;
}

/**
 * Gets all pieces that attack a specific square.
 *
 * @param position - The current position
 * @param square - The square to check for attackers
 * @param byColor - The color of the attacking pieces
 * @returns Array of square indices where attacking pieces are located
 */
export function getAttackers(position: BitboardPosition, square: number, byColor: Color): number[] {
  const attackers: number[] = [];

  // Generate all moves for the attacking color
  const attackingMoves = generateAllMoves(position, byColor);

  // Find all moves that target this square
  for (const move of attackingMoves) {
    if (move.to === square) {
      // Add the source square if not already in the list
      if (!attackers.includes(move.from)) {
        attackers.push(move.from);
      }
    }
  }

  return attackers;
}

/**
 * Checks if the commander of a specific color is in check.
 *
 * A commander is in check if it is attacked by any enemy piece.
 *
 * @param position - The current position
 * @param color - The color of the commander to check
 * @returns True if the commander is in check
 */
export function isCheck(position: BitboardPosition, color: Color): boolean {
  const commanderSquare = findCommanderSquare(position, color);
  if (commanderSquare === -1) {
    return false; // No commander found
  }

  const enemyColor: Color = color === 'r' ? 'b' : 'r';
  return isSquareAttacked(position, commanderSquare, enemyColor);
}

/**
 * Checks if the commander is exposed (facing enemy commander orthogonally).
 *
 * In CoTuLenh, commanders cannot face each other directly on the same rank or file
 * without any pieces between them. This is similar to the "flying general" rule
 * in Xiangqi.
 *
 * @param position - The current position
 * @param color - The color of the commander to check
 * @returns True if the commander is exposed to the enemy commander
 */
export function isCommanderExposed(position: BitboardPosition, color: Color): boolean {
  const commanderSquare = findCommanderSquare(position, color);
  if (commanderSquare === -1) {
    return false; // No commander found
  }

  const enemyColor: Color = color === 'r' ? 'b' : 'r';
  const enemyCommanderSquare = findCommanderSquare(position, enemyColor);
  if (enemyCommanderSquare === -1) {
    return false; // No enemy commander found
  }

  // Check if commanders are on the same rank or file
  const commanderFile = commanderSquare % 11;
  const commanderRank = Math.floor(commanderSquare / 11);
  const enemyFile = enemyCommanderSquare % 11;
  const enemyRank = Math.floor(enemyCommanderSquare / 11);

  // Same file (vertical)
  if (commanderFile === enemyFile) {
    const minRank = Math.min(commanderRank, enemyRank);
    const maxRank = Math.max(commanderRank, enemyRank);

    // Check if there are any pieces between them
    for (let rank = minRank + 1; rank < maxRank; rank++) {
      const betweenSquare = rank * 11 + commanderFile;
      if (position.isOccupied(betweenSquare)) {
        return false; // Blocked by a piece
      }
    }
    return true; // Exposed - no pieces between commanders
  }

  // Same rank (horizontal)
  if (commanderRank === enemyRank) {
    const minFile = Math.min(commanderFile, enemyFile);
    const maxFile = Math.max(commanderFile, enemyFile);

    // Check if there are any pieces between them
    for (let file = minFile + 1; file < maxFile; file++) {
      const betweenSquare = commanderRank * 11 + file;
      if (position.isOccupied(betweenSquare)) {
        return false; // Blocked by a piece
      }
    }
    return true; // Exposed - no pieces between commanders
  }

  return false; // Not on same rank or file
}

/**
 * Makes a move temporarily on the position (for legality checking).
 *
 * @param position - The position to modify
 * @param move - The move to make
 * @returns The captured piece if any, or null
 */
function makeTemporaryMove(
  position: BitboardPosition,
  move: Move
): { type: 'piece'; piece: any } | { type: 'stack'; stack: any } | null {
  // Remove piece from source
  const movingPiece = position.removePiece(move.from);

  // Capture piece at destination if any
  let capturedData = null;
  if (move.captured) {
    const capturedHasStack = position.stackManager.hasStack(move.to);
    if (capturedHasStack) {
      const capturedStack = position.stackManager.getStack(move.to);
      capturedData = { type: 'stack' as const, stack: capturedStack };
    }
    position.removePiece(move.to);
  }

  // Place piece at destination
  if (movingPiece) {
    position.placePiece(movingPiece, move.to);
  }

  return capturedData;
}

/**
 * Undoes a temporary move.
 *
 * @param position - The position to restore
 * @param move - The move to undo
 * @param capturedData - The captured piece/stack data if any
 */
function undoTemporaryMove(
  position: BitboardPosition,
  move: Move,
  capturedData: { type: 'piece'; piece: any } | { type: 'stack'; stack: any } | null
): void {
  // Remove piece from destination
  position.removePiece(move.to);

  // Restore captured piece if any
  if (move.captured) {
    position.placePiece(move.captured, move.to);

    // Restore stack if it was a stack
    if (capturedData?.type === 'stack') {
      position.stackManager.createStack(
        capturedData.stack.carrier,
        capturedData.stack.carried,
        move.to
      );
    }
  }

  // Restore piece at source
  position.placePiece(move.piece, move.from);
}

/**
 * Checks if a move is legal (doesn't leave commander in check or exposed).
 *
 * @param position - The current position
 * @param move - The move to check
 * @returns True if the move is legal
 */
export function isMoveLegal(position: BitboardPosition, move: Move): boolean {
  // Make the move temporarily
  const capturedData = makeTemporaryMove(position, move);

  // Check if commander is in check or exposed after the move
  const inCheck = isCheck(position, move.piece.color);
  const exposed = isCommanderExposed(position, move.piece.color);
  const legal = !inCheck && !exposed;

  // Undo the move
  undoTemporaryMove(position, move, capturedData);

  return legal;
}

/**
 * Filters out illegal moves (moves that leave commander in check or exposed).
 *
 * @param position - The current position
 * @param moves - The moves to filter
 * @returns Array of legal moves
 */
export function filterIllegalMoves(position: BitboardPosition, moves: Move[]): Move[] {
  const legalMoves: Move[] = [];

  for (const move of moves) {
    if (isMoveLegal(position, move)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

/**
 * Checks if the current position is checkmate for a specific color.
 *
 * Checkmate occurs when:
 * 1. The commander is in check
 * 2. There are no legal moves that escape check
 *
 * @param position - The current position
 * @param color - The color to check for checkmate
 * @returns True if the position is checkmate for the specified color
 */
export function isCheckmate(position: BitboardPosition, color: Color): boolean {
  // First check if the commander is in check
  if (!isCheck(position, color)) {
    return false; // Not in check, so not checkmate
  }

  // Generate all pseudo-legal moves
  const pseudoLegalMoves = generateAllMoves(position, color);

  // Filter for legal moves
  const legalMoves = filterIllegalMoves(position, pseudoLegalMoves);

  // Checkmate if no legal moves exist
  return legalMoves.length === 0;
}

/**
 * Checks if the current position is stalemate for a specific color.
 *
 * Stalemate occurs when:
 * 1. The commander is NOT in check
 * 2. There are no legal moves available
 *
 * @param position - The current position
 * @param color - The color to check for stalemate
 * @returns True if the position is stalemate for the specified color
 */
export function isStalemate(position: BitboardPosition, color: Color): boolean {
  // First check if the commander is in check
  if (isCheck(position, color)) {
    return false; // In check, so not stalemate
  }

  // Generate all pseudo-legal moves
  const pseudoLegalMoves = generateAllMoves(position, color);

  // Filter for legal moves
  const legalMoves = filterIllegalMoves(position, pseudoLegalMoves);

  // Stalemate if no legal moves exist
  return legalMoves.length === 0;
}
