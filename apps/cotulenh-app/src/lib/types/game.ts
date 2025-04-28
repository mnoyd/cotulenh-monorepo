import type { Square, Move, Color } from '@repo/cotulenh-core';

/**
 * Represents the possible states of the game.
 */
export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw';

/**
 * Defines the structure for the game's state.
 */
export interface GameState {
  fen: string; // Forsyth–Edwards Notation of the board
  turn: Color | null; // Current player's turn ('r' or 'b')
  history: Move[]; // History of moves made
  possibleMoves: Map<Square, Square[]>; // Possible moves for the current turn
  lastMove?: [Square, Square]; // The last move made [from, to]
  status: GameStatus; // Current status of the game
  check: boolean; // Is the current player in check?
  deployState: { stackSquare: number; turn: Color } | null; // Current deployment state
}
