import {
  StandardMove as Move,
  DeploySequence as DeployMove,
  type Color,
  type DeploySequence,
  type RecombineOption,
  type Square,
  type Piece
} from '@repo/cotulenh-core';

/**
 * Represents the possible states of the game.
 */
export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw';

/**
 * Extended deploy state for UI with additional computed properties
 */
export interface UIDeployState {
  stackSquare: number; // Internal square index
  turn: Color;
  originalPiece: Piece;
  movedPieces: Piece[];
  stay: Piece | undefined;

  actions: any[]; // Actions from the deploy session
  remainingPieces: any; // Remaining pieces to deploy
  recombineOptions: RecombineOption[]; // Available recombine options
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
