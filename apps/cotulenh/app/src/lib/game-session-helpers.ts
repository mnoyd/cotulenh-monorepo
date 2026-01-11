import type { Piece, Square, MoveResult } from '@cotulenh/core';

/**
 * Helper function to flatten a piece stack into individual pieces
 */
export function flattenPiece(piece: Piece): Piece[] {
  if (!piece.carrying?.length) return [piece];
  return [{ ...piece, carrying: undefined }, ...piece.carrying];
}

/**
 * Extract last move squares from a MoveResult for UI highlighting.
 */
export function extractLastMoveSquares(move: MoveResult | unknown): Square[] {
  if (!move) return [];

  if (
    typeof move !== 'object' ||
    move === null ||
    !('from' in move && 'to' in move && 'flags' in move)
  ) {
    return [];
  }

  const moveResult = move as MoveResult;

  if (moveResult.isDeploy || moveResult.flags?.includes('d') || moveResult.to instanceof Map) {
    if (moveResult.to instanceof Map) {
      return [moveResult.from, ...Array.from(moveResult.to.keys())];
    } else {
      return [moveResult.from, moveResult.to as string].filter(Boolean);
    }
  } else {
    return [moveResult.from, moveResult.to as string];
  }
}
