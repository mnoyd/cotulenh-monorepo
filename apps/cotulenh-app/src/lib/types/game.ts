import type { Square, Move, Color, DeployMove, DeployState } from '@repo/cotulenh-core';

/**
 * Represents the possible states of the game.
 */
export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw';

/**
 * Extended deploy state for UI with additional computed properties
 */
export interface UIDeployState extends DeployState {
  actions: any[]; // Actions from the deploy session
  remainingPieces: any; // Remaining pieces to deploy
}

/**
 * Defines the structure for the game's state.
 */
export interface GameState {
  fen: string; // Forsyth–Edwards Notation of the board
  turn: Color | null; // Current player's turn ('r' or 'b')
  history: (Move | DeployMove)[]; // History of moves made
  possibleMoves: Move[]; // Possible moves for the current turn
  lastMove?: Square[]; // The last move made [from, to]
  status: GameStatus; // Current status of the game
  check: boolean; // Is the current player in check?
  deployState: UIDeployState | null; // Current deployment state with UI helpers
}
