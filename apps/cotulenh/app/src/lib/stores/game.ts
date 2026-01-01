import { writable, type Readable } from 'svelte/store';
import { logger } from '@cotulenh/common';
import type { GameState, GameStatus, UIDeployState } from '$lib/types/game';
import { CoTuLenh, BITS, MoveResult } from '@cotulenh/core';
import type { Square, Piece } from '@cotulenh/core';
import { getPossibleMoves } from '$lib/utils';
import { produce } from 'immer';

/**
 * Helper function to flatten a piece (inline implementation)
 */
function flattenPiece(piece: Piece): Piece[] {
  if (!piece.carrying?.length) return [piece];
  return [{ ...piece, carrying: undefined }, ...piece.carrying];
}

/**
 * Get the current deploy state directly from the game instance.
 * This reads from core (source of truth) instead of a cached copy.
 * Always returns fresh data - no stale sync issues.
 */
export function getDeployState(game: CoTuLenh | null): UIDeployState | null {
  if (!game) return null;

  const session = game.getSession();
  if (!session || !session.isDeploy) return null;

  // Cast to any to access internal properties safely
  const s = session as any;

  const moves = s.moves || [];

  // Get pieces that were moved FROM the stack in this deploy session
  const movedPieces = moves
    .filter((move: any) => move.from === s.stackSquare && move.flags & BITS.DEPLOY)
    .flatMap((move: any) => flattenPiece(move.piece));

  // The "stay" piece is the first remaining piece (what stayed on the stack)
  const remainingPieces = s.remaining || [];
  const stayPiece = remainingPieces.length > 0 ? remainingPieces[0] : undefined;

  return {
    stackSquare: s.stackSquare,
    turn: s.turn,
    originalPiece: s.originalPiece,
    movedPieces,
    stay: stayPiece,
    actions: moves,
    remainingPieces,
    recombineOptions: s.getOptions?.() || []
  };
}

/**
 * Interface for the GameStore, explicitly defining the store contract and custom methods.
 * This fixes the issue where $gameStore is typed as 'unknown' in components.
 */
export interface GameStore extends Readable<GameState> {
  initialize(game: CoTuLenh): void;
  applyMove(game: CoTuLenh, move: MoveResult): void;
  sync(game: CoTuLenh): void;
  applyDeployCommit(game: CoTuLenh, move: MoveResult): void;
  handleUndo(game: CoTuLenh): void;
  previewMove(index: number): void;
  cancelPreview(game: CoTuLenh): void;
  reset(): void;
}

/**
 * Creates a Svelte store to manage the game state.
 */
function createGameStore(): GameStore {
  const initialState: GameState = {
    fen: '',
    turn: null,
    history: [],
    possibleMoves: [],
    status: 'playing',
    check: false,
    lastMove: undefined,
    historyViewIndex: -1
  };

  const { subscribe, set, update } = writable<GameState>(initialState);

  /**
   * Calculates the current game status based on the CoTuLenh instance.
   */
  function calculateGameStatus(game: CoTuLenh): GameStatus {
    // Cast to any to verify new methods that might not be in the build types yet
    const g = game as any;

    if (g.isGameOver()) {
      if (game.isCheckmate()) return 'checkmate';
      if (g.isStalemate && g.isStalemate()) return 'stalemate';
      if (g.isDraw && g.isDraw()) return 'draw';
      return 'checkmate'; // Commander captured or generic loss
    }
    return 'playing';
  }

  /**
   * Extract last move squares from a MoveResult for UI highlighting.
   */
  function extractLastMoveSquares(move: MoveResult | any): Square[] {
    if (!move) return [];

    // Check if it's a Deploy/Recombine move (which might have multiple destinations or map)
    if (move.isDeploy || move.flags?.includes('d') || move.to instanceof Map) {
      if (move.to instanceof Map) {
        return [move.from, ...Array.from(move.to.keys())];
      } else {
        // Fallback/Legacy or single deploy
        return [move.from, move.to].filter(Boolean);
      }
    } else {
      // Standard move
      return [move.from, move.to];
    }
  }

  /**
   * Consolidated state update using immer for immutable updates.
   * Centralizes the logic for syncing game state to the store.
   */
  function updateStateFromGame(draft: GameState, game: CoTuLenh, overrides?: Partial<GameState>) {
    const status = calculateGameStatus(game);
    const isPlaying = status === 'playing';

    draft.fen = game.fen();
    draft.turn = isPlaying ? game.turn() : null;
    draft.check = game.isCheck();
    draft.status = status;
    draft.possibleMoves = isPlaying ? getPossibleMoves(game) : [];

    // Apply any overrides (e.g., from history, after a move, etc.)
    if (overrides) {
      Object.assign(draft, overrides);
    }
  }

  return {
    subscribe,
    /**
     * Initializes the store with the state from a new game instance.
     * @param game The CoTuLenh game instance.
     */
    initialize(game: CoTuLenh) {
      const perfStart = performance.now();
      const possibleMoves = getPossibleMoves(game);
      logger.debug(`⏱️ Generated ${possibleMoves.length} moves in initialize`);

      const status = calculateGameStatus(game);

      update((state) =>
        produce(state, (draft) => {
          updateStateFromGame(draft, game, {
            history: [],
            possibleMoves: status === 'playing' ? possibleMoves : [],
            lastMove: undefined,
            historyViewIndex: -1
          });
        })
      );

      const perfEnd = performance.now();
      logger.debug(
        `⏱️ gameStore.initialize took ${(perfEnd - perfStart).toFixed(2)}ms (lazy loading enabled)`
      );
    },

    /**
     * Previews the game state at a specific history index.
     * Creates a temporary game instance to generate valid moves for that state.
     * @param index The history index to view (0-based)
     */
    previewMove(index: number) {
      update((state) =>
        produce(state, (draft) => {
          if (index < 0 || index >= state.history.length) return;

          const move = state.history[index];
          // Ensure we have an 'after' FEN. Both StandardMove and DeploySequence should have it.
          const fen = (move as any).after;

          if (!fen) {
            logger.error('No FEN found in history move', move);
            return;
          }

          // Create temporary game to get state details
          // We use try-catch to be safe
          try {
            // Use 'any' to bypass strict type checking if needed for basic usage
            const tempGame = new CoTuLenh(fen);

            draft.historyViewIndex = index;
            draft.fen = fen;
            draft.turn = tempGame.turn();
            draft.check = tempGame.isCheck();
            draft.possibleMoves = getPossibleMoves(tempGame);
            draft.lastMove = extractLastMoveSquares(move);
          } catch (e) {
            logger.error(e, 'Failed to preview move');
          }
        })
      );
    },

    /**
     * Cancels the history preview and returns to the live game state.
     * @param game The current live CoTuLenh game instance (needed to restore state)
     */
    cancelPreview(game: CoTuLenh) {
      // Just sync with the current live game
      this.sync(game);
    },

    /**
     * Updates the store after a move has been successfully made in the core game.
     * @param game The CoTuLenh game instance after the move.
     * @param move The move that was just made.
     */
    applyMove(game: CoTuLenh, move: MoveResult) {
      const perfStart = performance.now();

      update((state) =>
        produce(state, (draft) => {
          const session = game.getSession();
          const isDeploySession = session && session.isDeploy;
          const shouldAddToHistory = !isDeploySession;

          updateStateFromGame(draft, game, {
            fen: move.after,
            lastMove: extractLastMoveSquares(move),
            history: shouldAddToHistory ? [...state.history, move] : state.history,
            historyViewIndex: -1 // Reset preview on new move
          });
        })
      );

      const perfEnd = performance.now();
      logger.debug(
        `⏱️ gameStore.applyMove TOTAL took ${(perfEnd - perfStart).toFixed(2)}ms (lazy loading enabled)`
      );
    },

    /**
     * Syncs the store with the current game state without applying a move.
     * Useful for operations that modify game state in-place (like Recombine).
     * @param game The CoTuLenh game instance.
     */
    sync(game: CoTuLenh) {
      update((state) =>
        produce(state, (draft) => {
          updateStateFromGame(draft, game, {
            historyViewIndex: -1
          });
        })
      );
    },

    /**
     * Apply the final deployed move after commit
     * @param game The CoTuLenh game instance after commit
     * @param move The complete move result object
     */
    applyDeployCommit(game: CoTuLenh, move: MoveResult) {
      update((state) =>
        produce(state, (draft) => {
          updateStateFromGame(draft, game, {
            history: [...state.history, move], // Use the full move object
            lastMove: undefined,
            historyViewIndex: -1
          });
        })
      );
    },

    /**
     * Updates the store after an undo operation.
     * Syncs the entire state including history from the game instance.
     * @param game The CoTuLenh game instance after undo.
     */
    handleUndo(game: CoTuLenh) {
      const perfStart = performance.now();
      const history = game.history({ verbose: true });

      update((state) =>
        produce(state, (draft) => {
          // Recalculate lastMove based on the new last item in history
          let lastMoveSquares: Square[] | undefined = undefined;
          if (history.length > 0) {
            const lastMove = history[history.length - 1];
            lastMoveSquares = extractLastMoveSquares(lastMove);
          }

          updateStateFromGame(draft, game, {
            history,
            lastMove: lastMoveSquares,
            historyViewIndex: -1 // Reset preview on undo
          });
        })
      );

      const perfEnd = performance.now();
      logger.debug(`⏱️ gameStore.handleUndo took ${(perfEnd - perfStart).toFixed(2)}ms`);
    },

    /**
     * Resets the store to its initial state.
     */
    reset() {
      set(initialState);
    }
  };
}

// Export a singleton instance of the store
export const gameStore = createGameStore();
