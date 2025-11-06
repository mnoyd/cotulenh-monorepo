import { writable } from 'svelte/store';
import type { GameState, GameStatus, UIDeployState } from '$lib/types/game';
import { CoTuLenh, DeployMove, BITS } from '@repo/cotulenh-core';
import type { Square, Move, Piece } from '@repo/cotulenh-core';
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
  const session = game.getDeploySession();
  if (!session) return null;

  // Use modern DeploySession API instead of deprecated toLegacyDeployState()
  // Reconstruct the DeployState properties manually
  const actions = session.getActions();
  const movedPieces = actions
    .filter((move) => move.from === session.stackSquare && move.flags & BITS.DEPLOY)
    .flatMap((move) => flattenPiece(move.piece)); // Properly flatten pieces like the original

  return {
    // DeployState properties (reconstructed from modern API)
    stackSquare: session.stackSquare,
    turn: session.turn,
    originalPiece: session.originalPiece,
    movedPieces,
    stay: session.stayPieces,

    // UIDeployState additional properties
    actions: actions,
    remainingPieces: session.getRemainingPieces()
  };
}

/**
 * Creates a Svelte store to manage the game state.
 */
function createGameStore() {
  const initialState: GameState = {
    fen: '',
    turn: null,
    history: [],
    possibleMoves: [],
    status: 'playing',
    check: false,
    lastMove: undefined,
    deployState: null
  };

  const { subscribe, set, update } = writable<GameState>(initialState);

  /**
   * Calculates the current game status based on the CoTuLenh instance.
   */
  function calculateGameStatus(game: CoTuLenh): GameStatus {
    if (game.isCheckmate()) return 'checkmate';
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
      // ✅ OPTIMIZATION: Don't pre-generate all moves (lazy loading pattern)
      // Moves will be generated on-demand when user clicks a piece
      console.log('⏱️ Initializing game store with lazy move loading...');

      set({
        fen: game.fen(),
        turn: game.turn(),
        history: [],
        possibleMoves: [], // Empty - will be loaded on-demand per piece
        check: game.isCheck(),
        status: calculateGameStatus(game),
        lastMove: undefined,
        deployState: createUIDeployState(game)
      });
      const perfEnd = performance.now();
      console.log(
        `⏱️ gameStore.initialize took ${(perfEnd - perfStart).toFixed(2)}ms (lazy loading enabled)`
      );
    },

    /**
     * Updates the store after a move has been successfully made in the core game.
     * @param game The CoTuLenh game instance after the move.
     * @param move The move that was just made.
     */
    applyMove(game: CoTuLenh, move: Move) {
      const perfStart = performance.now();
      // ✅ OPTIMIZATION: Don't pre-generate all moves (lazy loading pattern)
      // Moves will be generated on-demand when user clicks next piece

      update((state) => {
        // Don't add individual deploy steps to history - only final committed deploy move
        const shouldAddToHistory = !game.getDeploySession();

        return {
          ...state,
          fen: game.fen(),
          turn: game.turn(),
          history: shouldAddToHistory ? [...state.history, move] : state.history,
          possibleMoves: [], // Empty - will be loaded on-demand per piece
          lastMove: [move.from, move.to],
          check: game.isCheck(),
          status: calculateGameStatus(game),
          deployState: createUIDeployState(game)
        };
      });
      const perfEnd = performance.now();
      console.log(
        `⏱️ gameStore.applyMove TOTAL took ${(perfEnd - perfStart).toFixed(2)}ms (lazy loading enabled)`
      );
    },
    /**
     * Apply the final deployed move after commit
     * @param game The CoTuLenh game instance after commit
     * @param deployMoveSan The SAN notation of the complete deploy move
     */
    applyDeployCommit(game: CoTuLenh, deployMoveSan: string) {
      update((state) => {
        // Create a minimal Move object with the deploy SAN for display
        // We only need the san property for history display
        const deployMove = {
          san: deployMoveSan
        } as Move;

        return {
          ...state,
          fen: game.fen(),
          turn: game.turn(),
          history: [...state.history, deployMove],
          possibleMoves: [],
          lastMove: undefined,
          check: game.isCheck(),
          status: calculateGameStatus(game),
          deployState: null
        };
      });
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
