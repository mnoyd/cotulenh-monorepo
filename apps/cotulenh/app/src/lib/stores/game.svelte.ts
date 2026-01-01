import { logger } from '@cotulenh/common';
import type { GameState, GameStatus, UIDeployState, HistoryMove } from '$lib/types/game';
import { CoTuLenh, BITS, MoveResult } from '@cotulenh/core';
import type { Square, Piece } from '@cotulenh/core';
import { getPossibleMoves } from '$lib/utils';

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
 * Internal state holder using Svelte 5's $state.
 * This is the single source of truth for game state.
 */
let state = $state<GameState>({
  fen: '',
  turn: null,
  history: [],
  possibleMoves: [],
  status: 'playing',
  check: false,
  lastMove: undefined,
  historyViewIndex: -1
});

/**
 * Update state from game instance with optional overrides.
 */
function updateStateFromGame(game: CoTuLenh, overrides?: Partial<GameState>) {
  const status = calculateGameStatus(game);
  const isPlaying = status === 'playing';

  state.fen = game.fen();
  state.turn = isPlaying ? game.turn() : null;
  state.check = game.isCheck();
  state.status = status;
  state.possibleMoves = isPlaying ? getPossibleMoves(game) : [];

  // Apply any overrides
  if (overrides) {
    Object.assign(state, overrides);
  }
}

/**
 * Game state API - use this object directly in components.
 * All properties are reactive getters that update automatically when state changes.
 *
 * Usage in components:
 * ```svelte
 * <script>
 *   import { gameState } from '$lib/stores/game.svelte';
 *
 *   // Access reactively via $derived
 *   let currentTurn = $derived(gameState.turn);
 *   let fen = $derived(gameState.fen);
 * </script>
 * ```
 */
export const gameState = {
  /** Current FEN string */
  get fen() {
    return state.fen;
  },
  /** Current player's turn */
  get turn() {
    return state.turn;
  },
  /** Move history */
  get history() {
    return state.history;
  },
  /** Possible moves for current position */
  get possibleMoves() {
    return state.possibleMoves;
  },
  /** Last move made [from, to] */
  get lastMove() {
    return state.lastMove;
  },
  /** Current game status */
  get status() {
    return state.status;
  },
  /** Is current player in check? */
  get check() {
    return state.check;
  },
  /** History view index (-1 for live game) */
  get historyViewIndex() {
    return state.historyViewIndex;
  },

  /**
   * Initialize the state with a new game instance.
   */
  initialize(game: CoTuLenh) {
    const perfStart = performance.now();
    const possibleMoves = getPossibleMoves(game);
    logger.debug(`⏱️ Generated ${possibleMoves.length} moves in initialize`);

    updateStateFromGame(game, {
      history: [],
      possibleMoves: calculateGameStatus(game) === 'playing' ? possibleMoves : [],
      lastMove: undefined,
      historyViewIndex: -1
    });

    const perfEnd = performance.now();
    logger.debug(`⏱️ gameState.initialize took ${(perfEnd - perfStart).toFixed(2)}ms`);
  },

  /**
   * Update state after a move.
   */
  applyMove(game: CoTuLenh, move: MoveResult) {
    const perfStart = performance.now();

    const session = game.getSession();
    const isDeploySession = session && session.isDeploy;
    const shouldAddToHistory = !isDeploySession;

    // Cast and attach cached moves directly to preserve prototype chain/getters if any
    if (shouldAddToHistory) {
      (move as HistoryMove).cachedMoves = state.possibleMoves;
    }

    updateStateFromGame(game, {
      fen: move.after,
      lastMove: extractLastMoveSquares(move),
      history: shouldAddToHistory ? [...state.history, move as HistoryMove] : state.history,
      historyViewIndex: -1
    });

    const perfEnd = performance.now();
    logger.debug(`⏱️ gameState.applyMove took ${(perfEnd - perfStart).toFixed(2)}ms`);
  },

  /**
   * Sync state with current game (for operations like Recombine).
   */
  sync(game: CoTuLenh) {
    updateStateFromGame(game);
  },

  /**
   * Apply deploy commit (final move after deploy session).
   */
  applyDeployCommit(game: CoTuLenh, move: MoveResult) {
    updateStateFromGame(game, {
      history: [...state.history, move],
      lastMove: undefined,
      historyViewIndex: -1
    });
  },

  /**
   * Update state after undo.
   */
  handleUndo(game: CoTuLenh) {
    const perfStart = performance.now();
    const history = game.history({ verbose: true });

    // Recalculate lastMove based on the new last item in history
    let lastMoveSquares: Square[] | undefined = undefined;
    if (history.length > 0) {
      const lastMove = history[history.length - 1];
      lastMoveSquares = extractLastMoveSquares(lastMove);
    }

    // Preserve cached moves by merging with existing state history
    const mergedHistory: HistoryMove[] = history.map((h, i) => {
      if (i < state.history.length && state.history[i].san === h.san) {
        return state.history[i];
      }
      return h;
    });

    updateStateFromGame(game, {
      history: mergedHistory,
      lastMove: lastMoveSquares,
      historyViewIndex: -1
    });

    const perfEnd = performance.now();
    logger.debug(`⏱️ gameState.handleUndo took ${(perfEnd - perfStart).toFixed(2)}ms`);
  },

  /**
   * Preview a move from history.
   */
  previewMove(index: number) {
    if (index < 0 || index >= state.history.length) return;

    const move = state.history[index];
    const fen = (move as any).after;

    if (!fen) {
      logger.error('No FEN found in history move', move);
      return;
    }

    try {
      state.historyViewIndex = index;
      state.fen = fen;
      state.lastMove = extractLastMoveSquares(move);

      // Check cache first
      if (move.cachedMoves) {
        state.possibleMoves = move.cachedMoves;
        // Turn/Check might need partial parsing or we can trust the move to carry enough info?
        // MoveResult usually doesn't have check status or turn. We still need rudimentary game state.
        // But for pure "preview" we can skip expensive move gen.
        // We still need 'turn' and 'check' for UI.
        const tempGame = new CoTuLenh(fen);
        state.turn = tempGame.turn();
        state.check = tempGame.isCheck();
      } else {
        const tempGame = new CoTuLenh(fen);
        state.turn = tempGame.turn();
        state.check = tempGame.isCheck();
        const moves = getPossibleMoves(tempGame);
        // Cache it for next time
        (state.history[index] as HistoryMove).cachedMoves = moves;
        state.possibleMoves = moves;
      }
    } catch (e) {
      logger.error(e, 'Failed to preview move');
    }
  },

  /**
   * Cancel history preview and return to live game.
   */
  cancelPreview(game: CoTuLenh) {
    // Find the last move from the live history to restore highlighting
    let lastMoveSquares: Square[] | undefined = undefined;
    if (state.history.length > 0) {
      const lastMove = state.history[state.history.length - 1];
      lastMoveSquares = extractLastMoveSquares(lastMove);
    }

    updateStateFromGame(game, {
      historyViewIndex: -1,
      lastMove: lastMoveSquares
    });
  },

  /**
   * Reset to initial state.
   */
  reset() {
    state.fen = '';
    state.turn = null;
    state.history = [];
    state.possibleMoves = [];
    state.status = 'playing';
    state.check = false;
    state.lastMove = undefined;
    state.historyViewIndex = -1;
  }
};
