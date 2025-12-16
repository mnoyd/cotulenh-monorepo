import type { CoTuLenh, StandardMove as Move } from '@repo/cotulenh-core';

// ============================================================================
// GAME UTILITIES
// ============================================================================

/**
 * Get all possible moves for the current position
 * @deprecated Consider using lazy loading with getMovesForSquare instead
 */
export function getPossibleMoves(game: CoTuLenh): Move[] {
  return game.moves({ verbose: true }) as Move[];
}

/**
 * Get possible moves for a specific square (lazy loading - RECOMMENDED)
 */
export function getMovesForSquare(game: CoTuLenh, square: string): Move[] {
  return game.moves({ verbose: true, square }) as Move[];
}

/**
 * Get all squares that have movable pieces
 */
export function getMovableSquares(game: CoTuLenh): string[] {
  const verboseMoves = game.moves({ verbose: true }) as Move[];
  const squares = new Set<string>();

  for (const move of verboseMoves) {
    squares.add(move.from);
  }

  return Array.from(squares);
}

/**
 * Get display name for turn color
 */
export function getTurnColorName(turn: 'r' | 'b'): string {
  return turn === 'r' ? 'Red' : 'Blue';
}
