/**
 * Bridge Layer - Lightweight communication between bitboard engine and UI
 *
 * Design principles from chess programming:
 * - No FEN in hot path (only for save/load)
 * - Simple objects for communication
 * - Incremental updates, not full state
 * - Square indices, not algebraic notation
 */

import type { Color, PieceSymbol } from './types';

/**
 * Lightweight piece representation for UI
 * Just what's needed to render a piece
 */
export interface UIPiece {
  type: PieceSymbol;
  color: Color;
  heroic: boolean;
  carrying?: UIPiece[]; // For stacks
}

/**
 * Simple move representation for UI
 * No internal flags, just what happened
 */
export interface UIMove {
  from: number; // Square index (0-89)
  to: number; // Square index
  piece: UIPiece;
  captured?: UIPiece;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

/**
 * Minimal game state for UI
 * Only what changes between moves
 */
export interface UIGameState {
  turn: Color;
  inCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  moveNumber: number;
}

/**
 * Legal moves for a square
 * UI needs this for highlighting valid destinations
 */
export interface UILegalMoves {
  from: number;
  destinations: number[]; // Just square indices
  canDeploy?: boolean; // If this is a stack
}

/**
 * Bridge interface - what UI can call
 */
export interface GameBridge {
  // Get current position (only call on init or after external changes)
  getPosition(): Map<number, UIPiece>;

  // Get legal moves for a square (call on piece selection)
  getLegalMoves(square: number): UILegalMoves;

  // Make a move (returns what happened)
  makeMove(from: number, to: number): UIMove | null;

  // Get current state (call after move)
  getState(): UIGameState;

  // Serialization (only for save/load/share)
  toFEN(): string;
  fromFEN(fen: string): void;
}

/**
 * Event-based updates (optional, for reactive UIs)
 */
export interface GameEvents {
  onMove?: (move: UIMove) => void;
  onStateChange?: (state: UIGameState) => void;
  onPositionChange?: (position: Map<number, UIPiece>) => void;
}
