import { writable, type Readable } from 'svelte/store';
import type { GameState, GameStatus, UIDeployState } from '$lib/types/game';
import {
  CoTuLenh,
  DeploySequence as DeployMove,
  BITS,
  StandardMove as Move
} from '@repo/cotulenh-core';
import type { Square, Piece } from '@repo/cotulenh-core';
import { getPossibleMoves } from '$lib/utils';

/**
 * Helper function to flatten a piece (inline implementation)
 */
function flattenPiece(piece: Piece): Piece[] {
  if (!piece.carrying?.length) return [piece];
  return [{ ...piece, carrying: undefined }, ...piece.carrying];
}

/**
 * Convert DeploySession to UIDeployState using modern API
 */
function createUIDeployState(game: CoTuLenh): UIDeployState | null {
  const session = game.getSession();
  // Ensure it is a deploy session (check isDeploy property if available, or just check fields)
  if (!session || !session.isDeploy) return null;

  // Use modern DeploySession API instead of deprecated toLegacyDeployState()
  // Reconstruct the DeployState properties manually
  // Note: We cast session to any because MoveSession type isn't fully exported/available here easily
  // or we could use the return type of getSession if it was generic.
  // We know it has these methods based on move-session.ts
  const s = session as any;

  const moves = s.moves;

  const movedPieces = moves
    .filter((move: any) => move.from === s.stackSquare && move.flags & BITS.DEPLOY)
    .flatMap((move: any) => flattenPiece(move.piece));

  return {
    // DeployState properties (reconstructed from modern API)
    stackSquare: s.stackSquare,
    turn: s.turn,
    originalPiece: s.originalPiece,
    movedPieces,
    stay: s.remaining.length > 0 ? s.remaining[0] : undefined, // Approximation for stay

    // UIDeployState additional properties
    actions: moves,
    remainingPieces: s.remaining,
    recombineOptions: s.getOptions() // Fetch available recombine options
  };
}

/**
 * Interface for the GameStore, explicitly defining the store contract and custom methods.
 * This fixes the issue where $gameStore is typed as 'unknown' in components.
 */
export interface GameStore extends Readable<GameState> {
  initialize(game: CoTuLenh): void;
  applyMove(game: CoTuLenh, move: Move | DeployMove): void;
  sync(game: CoTuLenh): void;
  applyDeployCommit(game: CoTuLenh, move: Move | DeployMove): void;
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
    deployState: null,
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

  return {
    subscribe,
    /**
     * Initializes the store with the state from a new game instance.
     * @param game The CoTuLenh game instance.
     */
    initialize(game: CoTuLenh) {
      const perfStart = performance.now();
      const possibleMoves = getPossibleMoves(game);
      console.log(`⏱️ Generated ${possibleMoves.length} moves in initialize`);

      const status = calculateGameStatus(game);
      const isPlaying = status === 'playing';

      set({
        fen: game.fen(),
        turn: isPlaying ? game.turn() : null,
        history: [],
        possibleMoves: isPlaying ? possibleMoves : [],
        check: game.isCheck(),
        status,
        lastMove: undefined,
        deployState: createUIDeployState(game),
        historyViewIndex: -1
      });
      const perfEnd = performance.now();
      console.log(
        `⏱️ gameStore.initialize took ${(perfEnd - perfStart).toFixed(2)}ms (lazy loading enabled)`
      );
    },

    /**
     * Previews the game state at a specific history index.
     * Creates a temporary game instance to generate valid moves for that state.
     * @param index The history index to view (0-based)
     */
    previewMove(index: number) {
      update((state) => {
        if (index < 0 || index >= state.history.length) return state;

        const move = state.history[index];
        // Ensure we have an 'after' FEN. Both StandardMove and DeploySequence should have it.
        const fen = (move as any).after;

        if (!fen) {
          console.error('No FEN found in history move', move);
          return state;
        }

        // Create temporary game to get state details
        // We use try-catch to be safe
        try {
          // Use 'any' to bypass strict type checking if needed for basic usage
          const tempGame = new CoTuLenh(fen);

          return {
            ...state,
            historyViewIndex: index,
            fen: fen,
            turn: tempGame.turn(),
            check: tempGame.isCheck(),
            // We can calculate status but 'playing' is likely fine for history
            // status: calculateGameStatus(tempGame),
            possibleMoves: getPossibleMoves(tempGame),
            lastMove: GameStoreUtils.extractLastMoveSquares(move),
            deployState: null // Deploy state usually irrelevant when viewing history?
            // Or we might need to reconstruct if we viewed a deploy step?
            // Since history items are "Committed" moves, deploy sessions are done.
          };
        } catch (e) {
          console.error('Failed to preview move', e);
          return state;
        }
      });
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
    applyMove(game: CoTuLenh, move: Move | DeployMove) {
      const perfStart = performance.now();
      const possibleMoves = getPossibleMoves(game);

      update((state) => {
        const session = game.getSession();
        const isDeploySession = session && session.isDeploy;
        const shouldAddToHistory = !isDeploySession;

        let lastMoveSquares: any[] = GameStoreUtils.extractLastMoveSquares(move);
        const status = calculateGameStatus(game);
        const isPlaying = status === 'playing';

        return {
          ...state,
          fen: game.fen(),
          turn: isPlaying ? game.turn() : null,
          history: shouldAddToHistory ? [...state.history, move] : state.history,
          possibleMoves: isPlaying ? possibleMoves : [], // Full load enabled
          lastMove: lastMoveSquares,
          check: game.isCheck(),
          status,
          deployState: createUIDeployState(game),
          historyViewIndex: -1 // Reset preview on new move
        };
      });
      const perfEnd = performance.now();
      console.log(
        `⏱️ gameStore.applyMove TOTAL took ${(perfEnd - perfStart).toFixed(2)}ms (lazy loading enabled)`
      );
    },

    /**
     * Syncs the store with the current game state without applying a move.
     * Useful for operations that modify game state in-place (like Recombine).
     * @param game The CoTuLenh game instance.
     */
    sync(game: CoTuLenh) {
      update((state) => {
        const status = calculateGameStatus(game);
        const isPlaying = status === 'playing';
        return {
          ...state,
          fen: game.fen(),
          turn: isPlaying ? game.turn() : null,
          check: game.isCheck(),
          possibleMoves: isPlaying ? getPossibleMoves(game) : [], // Ensure moves are up to date (e.g. after cancelPreview)
          status,
          deployState: createUIDeployState(game),
          historyViewIndex: -1
        };
      });
    },

    /**
     * Apply the final deployed move after commit
     * @param game The CoTuLenh game instance after commit
     * @param move The complete move object (StandardMove or DeploySequence)
     */
    applyDeployCommit(game: CoTuLenh, move: Move | DeployMove) {
      const possibleMoves = getPossibleMoves(game);

      update((state) => {
        const status = calculateGameStatus(game);
        const isPlaying = status === 'playing';

        return {
          ...state,
          fen: game.fen(),
          turn: isPlaying ? game.turn() : null,
          history: [...state.history, move], // Use the full move object
          possibleMoves: isPlaying ? possibleMoves : [],
          lastMove: undefined,
          check: game.isCheck(),
          status,
          deployState: null,
          historyViewIndex: -1
        };
      });
    },

    /**
     * Updates the store after an undo operation.
     * Syncs the entire state including history from the game instance.
     * @param game The CoTuLenh game instance after undo.
     */
    handleUndo(game: CoTuLenh) {
      const perfStart = performance.now();
      const possibleMoves = getPossibleMoves(game);
      const history = game.history({ verbose: true });

      update((state) => {
        // Recalculate lastMove based on the new last item in history
        let lastMoveSquares: any[] | undefined = undefined;
        if (history.length > 0) {
          const lastMove = history[history.length - 1];
          lastMoveSquares = GameStoreUtils.extractLastMoveSquares(lastMove);
        }

        const status = calculateGameStatus(game);
        const isPlaying = status === 'playing';

        return {
          ...state,
          fen: game.fen(),
          turn: isPlaying ? game.turn() : null,
          history: history,
          possibleMoves: isPlaying ? possibleMoves : [],
          lastMove: lastMoveSquares,
          check: game.isCheck(),
          status,
          deployState: createUIDeployState(game),
          historyViewIndex: -1 // Reset preview on undo
        };
      });

      const perfEnd = performance.now();
      console.log(`⏱️ gameStore.handleUndo took ${(perfEnd - perfStart).toFixed(2)}ms`);
    },

    /**
     * Resets the store to its initial state.
     */
    reset() {
      set(initialState);
    }
  };
}

// Helper utilities for GameStore to avoid code duplication
const GameStoreUtils = {
  extractLastMoveSquares(move: Move | DeployMove | any): any[] {
    if (!move) return [];

    // Check if it's a DeployMove/Sequence
    if (
      (move as any).isDeploy ||
      (move as any).flags?.includes('d') ||
      (move as DeployMove).to instanceof Map
    ) {
      const dm = move as DeployMove;
      if (dm.to instanceof Map) {
        return [dm.from, ...Array.from(dm.to.keys())];
      } else {
        // Fallback/Legacy
        return [dm.from, (dm as any).to].filter(Boolean);
      }
    } else {
      const sm = move as Move;
      return [sm.from, sm.to];
    }
  }
};

// Export a singleton instance of the store
export const gameStore = createGameStore();
