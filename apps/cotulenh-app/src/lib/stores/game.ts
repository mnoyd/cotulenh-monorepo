import { writable } from 'svelte/store';
import type { GameState, GameStatus } from '$lib/types/game';
import type {
  CoTuLenh,
  StandardMove as Move,
  DeploySequence as DeployMove
} from '@repo/cotulenh-core';

// ============================================================================
// GAME STATE STORE
// ============================================================================

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
   * Calculate game status from the game instance
   */
  function getGameStatus(game: CoTuLenh): GameStatus {
    if (game.isCheckmate()) return 'checkmate';
    return 'playing';
  }

  /**
   * Extract all current state from the game instance
   */
  function extractGameState(game: CoTuLenh): Omit<GameState, 'history' | 'lastMove'> {
    return {
      fen: game.fen(),
      turn: game.turn(),
      possibleMoves: game.moves({ verbose: true }) as Move[],
      check: game.isCheck(),
      status: getGameStatus(game),
      deployState: null // Will be set separately if needed
    };
  }

  return {
    subscribe,

    /**
     * Initialize the store with a new game instance
     */
    initialize(game: CoTuLenh) {
      set({
        ...extractGameState(game),
        history: [],
        lastMove: undefined
      });
    },

    /**
     * Refresh store after a standard move
     */
    afterMove(game: CoTuLenh, move: Move | DeployMove) {
      update((state) => {
        const session = game.getSession();
        const isInDeploySession = session && session.isDeploy;

        // Calculate last move squares
        let lastMoveSquares: string[] | undefined;
        if (move.isDeploy) {
          const dm = move as DeployMove;
          lastMoveSquares =
            dm.to instanceof Map ? [dm.from, ...Array.from(dm.to.keys())] : [dm.from];
        } else {
          const sm = move as Move;
          lastMoveSquares = [sm.from, sm.to];
        }

        return {
          ...extractGameState(game),
          // Only add to history if not in a deploy session
          history: isInDeploySession ? state.history : [...state.history, move],
          lastMove: lastMoveSquares
        };
      });
    },

    /**
     * Refresh store after deploy session commit
     */
    afterDeployCommit(game: CoTuLenh, deploySan: string) {
      update((state) => ({
        ...extractGameState(game),
        history: [...state.history, { san: deploySan } as Move],
        lastMove: undefined
      }));
    },

    /**
     * Refresh store after any state change (e.g., session cancel)
     */
    refresh(game: CoTuLenh) {
      update((state) => ({
        ...extractGameState(game),
        history: state.history,
        lastMove: state.lastMove
      }));
    },

    /**
     * Reset to initial state
     */
    reset() {
      set(initialState);
    }
  };
}

export const gameStore = createGameStore();
