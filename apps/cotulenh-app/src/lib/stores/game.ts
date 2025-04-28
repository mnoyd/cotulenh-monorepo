import { writable } from 'svelte/store';
import type { GameState, GameStatus } from '$lib/types/game';
import { CoTuLenh } from '@repo/cotulenh-core';
import type { Square, Move } from '@repo/cotulenh-core';
import { getPossibleMoves } from '$lib/utils';

/**
 * Creates a Svelte store to manage the game state.
 */
function createGameStore() {
  const initialState: GameState = {
    fen: '',
    turn: null,
    history: [],
    possibleMoves: new Map<Square, Square[]>(),
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
      set({
        fen: game.fen(),
        turn: game.turn(),
        history: [],
        possibleMoves: getPossibleMoves(game),
        check: game.isCheck(),
        status: calculateGameStatus(game),
        lastMove: undefined,
        deployState: game['_deployState']
      });
    },

    /**
     * Updates the store after a move has been successfully made in the core game.
     * @param game The CoTuLenh game instance after the move.
     * @param move The move that was just made.
     */
    applyMove(game: CoTuLenh, move: Move) {
      update((state) => ({
        ...state,
        fen: game.fen(),
        turn: game.turn(),
        history: [...state.history, move], // Append the new move
        possibleMoves: getPossibleMoves(game),
        lastMove: [move.from, move.to],
        check: game.isCheck(),
        status: calculateGameStatus(game),
        deployState: game['_deployState']
      }));
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
