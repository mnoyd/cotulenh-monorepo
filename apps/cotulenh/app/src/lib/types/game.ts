import {
  MoveResult,
  type Color,
  type RecombineOption,
  type Square,
  type Piece
} from '@cotulenh/core';

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
  history: MoveResult[]; // History of moves made
  possibleMoves: MoveResult[]; // Possible moves for the current turn
  lastMove?: Square[]; // The last move made [from, to]
  status: GameStatus; // Current status of the game
  check: boolean; // Is the current player in check?
  deployState: UIDeployState | null; // Current deployment state with UI helpers
  historyViewIndex: number; // Index of the history item currently being viewed (-1 if viewing live game)
}
