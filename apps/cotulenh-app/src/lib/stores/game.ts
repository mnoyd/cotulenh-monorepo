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

  const actions = s.getActions ? s.getActions() : s._commands.map((c: any) => c.move); // Fallback if getActions not public
  // Actually move-session.ts says get moves() returns internal moves.
  // And `moves` getter IS public.

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
  applyDeployCommit(game: CoTuLenh, deployMoveSan: string): void;
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
      const possibleMoves = getPossibleMoves(game);
      console.log(`⏱️ Generated ${possibleMoves.length} moves in initialize`);

      set({
        fen: game.fen(),
        turn: game.turn(),
        history: [],
        possibleMoves,
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
    applyMove(game: CoTuLenh, move: Move | DeployMove) {
      const perfStart = performance.now();
      const possibleMoves = getPossibleMoves(game);

      update((state) => {
        const session = game.getSession();
        const isDeploySession = session && session.isDeploy;
        // If we are in a deploy session, we DON'T add to history (yet).
        // We only add when the session is committed (which handled separately or by the commit logic).
        // Wait, applyMove is called when the core returns a MoveResult.
        // If it's a deploy step (intermediate), we might not want to add it to the main history list shown in UI?
        // The original code was: const shouldAddToHistory = !game.getDeploySession();
        // So:
        const shouldAddToHistory = !isDeploySession;

        let lastMoveSquares: any[] = [];
        if (move.isDeploy) {
          const dm = move as DeployMove;
          // DeploySequence has 'to' as Map<Square, Piece>
          if (dm.to instanceof Map) {
            lastMoveSquares = [dm.from, ...Array.from(dm.to.keys())];
          } else {
            // Fallback if structure is different
            lastMoveSquares = [dm.from];
          }
        } else {
          const sm = move as Move;
          lastMoveSquares = [sm.from, sm.to];
        }

        return {
          ...state,
          fen: game.fen(),
          turn: game.turn(),
          history: shouldAddToHistory ? [...state.history, move] : state.history,
          possibleMoves, // Full load enabled
          lastMove: lastMoveSquares,
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
     * Syncs the store with the current game state without applying a move.
     * Useful for operations that modify game state in-place (like Recombine).
     * @param game The CoTuLenh game instance.
     */
    sync(game: CoTuLenh) {
      update((state) => {
        return {
          ...state,
          fen: game.fen(),
          turn: game.turn(),
          check: game.isCheck(),
          status: calculateGameStatus(game),
          deployState: createUIDeployState(game)
          // history is NOT updated here, as Recombine modifies history internally/will be handled separately or by full reload if needed.
          // Actually Recombine modifies the *session* history, not the main game history yet.
        };
      });
    },

    /**
     * Apply the final deployed move after commit
     * @param game The CoTuLenh game instance after commit
     * @param deployMoveSan The SAN notation of the complete deploy move
     */
    applyDeployCommit(game: CoTuLenh, deployMoveSan: string) {
      const possibleMoves = getPossibleMoves(game);

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
          possibleMoves,
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
