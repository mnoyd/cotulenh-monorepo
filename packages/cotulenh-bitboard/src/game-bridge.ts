/**
 * Game Bridge Implementation
 *
 * Connects the bitboard engine to UI components with minimal overhead.
 * Inspired by chess programming patterns (chessground + chessops).
 */

import type { BitboardPosition } from './position';
import type { GameBridge, UIGameState, UILegalMoves, UIMove, UIPiece, GameEvents } from './bridge';
import type { Color } from './types';

/**
 * Concrete bridge implementation for the bitboard engine.
 *
 * Design principles:
 * - Lazy evaluation (only compute what's requested)
 * - No FEN generation in hot path
 * - Simple data structures for UI
 * - Event-driven updates (optional)
 */
export class BitboardGameBridge implements GameBridge {
  private position: BitboardPosition;
  private currentTurn: Color;
  private events?: GameEvents;

  constructor(position: BitboardPosition, initialTurn: Color = 'r', events?: GameEvents) {
    this.position = position;
    this.currentTurn = initialTurn;
    this.events = events;
  }

  /**
   * Get current position as a map of square -> piece.
   * Only call this on initialization or after external changes.
   *
   * For incremental updates, use events instead.
   */
  getPosition(): Map<number, UIPiece> {
    const position = new Map<number, UIPiece>();

    // Iterate through all 132 squares (0-131)
    for (let square = 0; square < 132; square++) {
      const piece = this.position.getPieceAt(square);
      if (piece) {
        position.set(square, this.convertToUIPiece(piece));
      }
    }

    return position;
  }

  /**
   * Get legal moves for a specific square.
   * Called when user selects a piece.
   *
   * Returns just the destination squares - UI highlights these.
   */
  getLegalMoves(square: number): UILegalMoves {
    // TODO: Integrate with move generator when implemented
    // For now, return empty
    return {
      from: square,
      destinations: [],
      canDeploy: this.position.stackManager.hasStack(square)
    };
  }

  /**
   * Make a move from one square to another.
   * Returns what happened (for UI animation/update).
   *
   * Returns null if move is illegal.
   */
  makeMove(from: number, to: number): UIMove | null {
    // TODO: Integrate with move generator and move application
    // This is a placeholder implementation

    const piece = this.position.getPieceAt(from);
    if (!piece) {
      return null;
    }

    // Check if destination has a piece (capture)
    const captured = this.position.getPieceAt(to);

    // Apply the move (simplified - real implementation needs validation)
    const removedPiece = this.position.removePiece(from);
    if (!removedPiece) {
      return null;
    }

    this.position.placePiece(removedPiece, to);

    // Create UI move object
    const uiMove: UIMove = {
      from,
      to,
      piece: this.convertToUIPiece(piece),
      captured: captured ? this.convertToUIPiece(captured) : undefined,
      // TODO: Add check/checkmate detection
      isCheck: false,
      isCheckmate: false
    };

    // Switch turn
    this.currentTurn = this.currentTurn === 'r' ? 'b' : 'r';

    // Emit event if listener exists
    if (this.events?.onMove) {
      this.events.onMove(uiMove);
    }

    if (this.events?.onStateChange) {
      this.events.onStateChange(this.getState());
    }

    return uiMove;
  }

  /**
   * Get current game state.
   * Called after moves to update UI indicators.
   */
  getState(): UIGameState {
    // TODO: Integrate with check detection when implemented
    return {
      turn: this.currentTurn,
      inCheck: false,
      isCheckmate: false,
      isStalemate: false,
      moveNumber: 1 // TODO: Track move number
    };
  }

  /**
   * Serialize to FEN (only for save/load/share).
   * NOT called in hot path.
   */
  toFEN(): string {
    // TODO: Implement FEN generation
    return '';
  }

  /**
   * Load from FEN (only for save/load/share).
   * NOT called in hot path.
   */
  fromFEN(fen: string): void {
    // TODO: Implement FEN parsing
    this.position.clear();

    // Emit position change event
    if (this.events?.onPositionChange) {
      this.events.onPositionChange(this.getPosition());
    }
  }

  /**
   * Convert internal Piece to UI-friendly UIPiece.
   * Strips internal flags and metadata.
   */
  private convertToUIPiece(piece: any): UIPiece {
    return {
      type: piece.type,
      color: piece.color,
      heroic: piece.heroic || false,
      carrying: piece.carrying?.map((p: any) => this.convertToUIPiece(p))
    };
  }
}
