import { tick } from 'svelte';
import { logger } from '@cotulenh/common';
import { logRender } from '$lib/debug';
import type { Api, Config, DestMove, OrigMove, Key } from '@cotulenh/board';
import { CoTuLenh, BITS, BLUE, RED } from '@cotulenh/core';
import type { Color, Square, Piece, MoveResult } from '@cotulenh/core';
import { makeCoreMove } from '$lib/utils';
import { toast } from 'svelte-sonner';
import {
  coreToBoardColor,
  coreToBoardCheck,
  mapPossibleMovesToDests,
  mapLastMoveToBoardFormat
} from '$lib/features/game/utils.js';
import type {
  GameStatus,
  UIDeployState,
  HistoryMove,
  DeploySession,
  DeployAction,
  ExtendedGame
} from '$lib/types/game';

/**
 * Helper function to flatten a piece
 */
function flattenPiece(piece: Piece): Piece[] {
  if (!piece.carrying?.length) return [piece];
  return [{ ...piece, carrying: undefined }, ...piece.carrying];
}

/**
 * Extract last move squares from a MoveResult for UI highlighting.
 */
function extractLastMoveSquares(move: MoveResult | unknown): Square[] {
  if (!move) return [];

  if (
    typeof move !== 'object' ||
    move === null ||
    !('from' in move && 'to' in move && 'flags' in move)
  ) {
    return [];
  }

  const moveResult = move as MoveResult;

  if (moveResult.isDeploy || moveResult.flags?.includes('d') || moveResult.to instanceof Map) {
    if (moveResult.to instanceof Map) {
      return [moveResult.from, ...Array.from(moveResult.to.keys())];
    } else {
      return [moveResult.from, moveResult.to as string].filter(Boolean);
    }
  } else {
    return [moveResult.from, moveResult.to as string];
  }
}

/**
 * GameSession - Unified reactive state management using the Reactive Adapter Pattern.
 *
 * This class wraps the imperative CoTuLenh game engine with Svelte 5 reactivity.
 * The #version counter acts as a "heartbeat" - any mutation bumps version,
 * triggering all derived state to update automatically.
 *
 * Benefits:
 * - Single source of truth (game instance + version)
 * - No manual syncing between store and engine
 * - Automatic reactivity cascade
 * - No ordering bugs
 */
export class GameSession {
  // The imperative game engine (the real source of truth for game logic)
  #game: CoTuLenh;

  // The "heartbeat" - bump this on any mutation to trigger reactivity
  #version = $state(0);

  // UI-only state (not in the game engine)
  #history = $state<HistoryMove[]>([]);
  #historyViewIndex = $state(-1);
  #originalFen: string | undefined;

  // Board integration
  #boardApi = $state<Api | null>(null);
  #isUpdatingBoard = $state(false);

  // Memoization to prevent duplicate syncs
  #lastSyncedFen: string | null = null;
  #lastSyncedHistoryIdx: number | null = null;

  constructor(fen?: string) {
    this.#originalFen = fen;
    this.#game = fen ? new CoTuLenh(fen) : new CoTuLenh();
  }

  // ============================================================
  // REACTIVE GETTERS - Read from engine, auto-track via #version
  // ============================================================

  get fen(): string {
    void this.#version; // Register dependency
    if (this.#historyViewIndex !== -1 && this.#history[this.#historyViewIndex]) {
      return this.#history[this.#historyViewIndex].after;
    }
    return this.#game.fen();
  }

  get turn(): Color | null {
    void this.#version;
    if (this.status !== 'playing') return null;
    if (this.#historyViewIndex !== -1 && this.#history[this.#historyViewIndex]) {
      // For preview, parse turn from the previewed FEN
      const previewFen = this.#history[this.#historyViewIndex].after;
      const parts = previewFen.split(' ');
      return (parts[1] as Color) || null;
    }
    return this.#game.turn();
  }

  get status(): GameStatus {
    void this.#version;
    const extendedGame = this.#game as unknown as ExtendedGame;
    if (extendedGame.isGameOver()) {
      if (this.#game.isCheckmate()) return 'checkmate';
      if (extendedGame.isStalemate?.()) return 'stalemate';
      if (extendedGame.isDraw?.()) return 'draw';
      return 'checkmate';
    }
    return 'playing';
  }

  get check(): boolean {
    void this.#version;
    return this.#game.isCheck();
  }

  get winner(): Color | null {
    void this.#version;
    if (this.status === 'playing') return null;
    return this.#game.turn() === 'r' ? 'b' : 'r';
  }

  get history(): HistoryMove[] {
    void this.#version;
    return this.#history;
  }

  get historyViewIndex(): number {
    return this.#historyViewIndex;
  }

  get lastMove(): Square[] | undefined {
    void this.#version;
    if (this.#historyViewIndex !== -1) {
      const move = this.#history[this.#historyViewIndex];
      return move ? extractLastMoveSquares(move) : undefined;
    }
    if (this.#history.length > 0) {
      return extractLastMoveSquares(this.#history[this.#history.length - 1]);
    }
    return undefined;
  }

  get possibleMoves(): MoveResult[] {
    void this.#version;
    if (this.status !== 'playing' || this.#historyViewIndex !== -1) return [];
    return this.#game.moves({ verbose: true }) as MoveResult[];
  }

  get deployState(): UIDeployState | null {
    void this.#version;
    const session = this.#game.getSession();
    if (!session || !session.isDeploy) return null;

    const deploySession = session as unknown as DeploySession;
    const moves = deploySession.moves || [];

    const movedPieces = moves
      .filter(
        (move: DeployAction) => move.from === deploySession.stackSquare && move.flags & BITS.DEPLOY
      )
      .flatMap((move: DeployAction) => flattenPiece(move.piece));

    const remainingPieces = deploySession.remaining || [];
    const stayPiece = remainingPieces.length > 0 ? remainingPieces[0] : undefined;

    return {
      stackSquare: deploySession.stackSquare,
      turn: deploySession.turn,
      originalPiece: deploySession.originalPiece,
      movedPieces,
      stay: stayPiece,
      actions: moves,
      remainingPieces
    };
  }

  get originalFen(): string | undefined {
    return this.#originalFen;
  }

  get isViewingHistory(): boolean {
    return this.#historyViewIndex !== -1;
  }

  get canUndo(): boolean {
    void this.#version;
    return this.#game.history().length > 0 || this.#game.getSession() !== null;
  }

  get canCommitSession(): boolean {
    void this.#version;
    return this.#game.canCommitSession();
  }

  // ============================================================
  // BOARD CONFIGURATION - Derived config for the board component
  // ============================================================

  get boardConfig(): Config {
    return {
      fen: this.fen,
      viewOnly: this.status !== 'playing' || this.#historyViewIndex !== -1,
      turnColor: coreToBoardColor(this.turn),
      lastMove: mapLastMoveToBoardFormat(this.lastMove),
      check: coreToBoardCheck(this.check, this.turn),
      airDefense: { influenceZone: this.#getAirDefense() },
      movable: {
        free: false,
        color: coreToBoardColor(this.turn),
        dests: mapPossibleMovesToDests(this.possibleMoves),
        events: {
          after: (orig: OrigMove, dest: DestMove) => this.#handleMove(orig, dest),
          session: {
            cancel: () => this.cancelDeploy(),
            complete: () => this.commitDeploy()
          }
        }
      }
    } as unknown as Config;
  }

  #getAirDefense(): { red: Map<Key, Key[]>; blue: Map<Key, Key[]> } {
    const airDefense = this.#game.getAirDefenseInfluence();
    return {
      red: airDefense[RED],
      blue: airDefense[BLUE]
    };
  }

  // ============================================================
  // BOARD INTEGRATION
  // ============================================================

  setBoardApi(api: Api): void {
    this.#boardApi = api;
    logger.debug('Board API ready');
  }

  get boardApi(): Api | null {
    return this.#boardApi;
  }

  syncBoard(): void {
    logRender('🔄 [RENDER] game-session.svelte.ts - syncBoard() called', {
      hasBoardApi: !!this.#boardApi,
      turnColor: this.turn,
      fen: this.fen
    });
    if (this.#boardApi) {
      this.#boardApi.set(this.boardConfig);
    }
  }

  // ============================================================
  // ACTION METHODS - Mutate game and bump version
  // ============================================================

  #handleMove(orig: OrigMove, dest: DestMove): void {
    if (this.#isUpdatingBoard) {
      logger.warn('Move attempted while board is updating, ignoring');
      return;
    }

    try {
      // If viewing history, truncate to that point first
      if (this.#historyViewIndex !== -1 && this.#historyViewIndex < this.#history.length - 1) {
        const undoCount = this.#history.length - (this.#historyViewIndex + 1);
        for (let i = 0; i < undoCount; i++) {
          this.#game.undo();
        }
        this.#history = this.#history.slice(0, this.#historyViewIndex + 1);
        this.#historyViewIndex = -1;
      } else if (this.#historyViewIndex === this.#history.length - 1) {
        this.#historyViewIndex = -1;
      }

      const moveResult = makeCoreMove(this.#game, orig, dest);

      if (moveResult) {
        const session = this.#game.getSession();
        const isDeploySession = session && session.isDeploy;

        // Only add to history if not in an active deploy session
        if (!isDeploySession) {
          this.#history = [...this.#history, moveResult as HistoryMove];
        }
        this.#version++;
      } else {
        logger.warn('Illegal move attempted on board', { orig, dest });
      }
    } catch (error) {
      logger.error('Error making move in game engine:', { error });
      this.syncBoard();
    }
  }

  undo(): void {
    const session = this.#game.getSession();

    this.#game.undo();

    // Only pop history if we're NOT in a deploy session
    if (!session && this.#history.length > 0) {
      this.#history = this.#history.slice(0, -1);
    }

    this.#historyViewIndex = -1;
    this.#version++;
    toast.info('Undo successful');
  }

  reset(): void {
    this.#game = this.#originalFen ? new CoTuLenh(this.#originalFen) : new CoTuLenh();
    this.#history = [];
    this.#historyViewIndex = -1;
    this.#version++;
    toast.success('Game reset');
  }

  commitDeploy(): void {
    try {
      const session = this.#game.getSession();
      if (!session || !session.isDeploy) {
        logger.error('❌ No deploy session active');
        return;
      }

      const result = this.#game.commitSession();

      if (!result.success || !result.result) {
        const reason = result.reason || 'Unknown error';
        logger.error('❌ Failed to commit:', reason);
        toast.error(`Cannot finish deployment: ${reason}`);
        return;
      }

      this.#history = [...this.#history, result.result as HistoryMove];
      this.#version++;
    } catch (error) {
      logger.error('❌ Failed to commit deploy session:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Cannot finish deployment: ${errorMsg}`);
    }
  }

  cancelDeploy(): void {
    try {
      this.#game.cancelSession();
      this.#version++;
    } catch (error) {
      logger.error('❌ Failed to cancel deploy:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error cancelling deployment: ${errorMsg}`);
    }
  }

  // ============================================================
  // HISTORY NAVIGATION
  // ============================================================

  previewMove(index: number): void {
    if (index < 0 || index >= this.#history.length) return;
    this.#historyViewIndex = index;
    this.#version++;
  }

  cancelPreview(): void {
    this.#historyViewIndex = -1;
    this.#version++;
  }

  flipBoard(): void {
    if (this.#boardApi) {
      this.#boardApi.toggleOrientation();
    }
  }

  // ============================================================
  // KEYBOARD HANDLING
  // ============================================================

  handleKeydown = (e: KeyboardEvent): void => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    switch (e.key) {
      case 'z':
      case 'Z':
        e.preventDefault();
        if (this.canUndo) {
          this.undo();
        }
        break;
      case 'y':
      case 'Y':
        e.preventDefault();
        toast.info('Redo coming soon');
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        if (confirm('Are you sure you want to reset the game?')) {
          this.reset();
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (this.#game.getSession()) {
          this.cancelDeploy();
        } else if (this.#historyViewIndex !== -1) {
          this.cancelPreview();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (this.#historyViewIndex === -1) {
          // Go to last move
          if (this.#history.length > 0) {
            this.previewMove(this.#history.length - 1);
          }
        } else if (this.#historyViewIndex > 0) {
          this.previewMove(this.#historyViewIndex - 1);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (this.#historyViewIndex !== -1) {
          if (this.#historyViewIndex >= this.#history.length - 1) {
            this.cancelPreview();
          } else {
            this.previewMove(this.#historyViewIndex + 1);
          }
        }
        break;
    }
  };

  // ============================================================
  // BOARD EFFECT - Call from $effect in component
  // ============================================================

  setupBoardEffect(): void {
    // Access reactive properties to register dependencies
    const currentFen = this.fen;
    const currentHistoryIdx = this.historyViewIndex;
    void this.deployState;

    // Skip if already synced with these exact values
    if (this.#lastSyncedFen === currentFen && this.#lastSyncedHistoryIdx === currentHistoryIdx) {
      return;
    }

    logRender('🔄 [RENDER] game-session.svelte.ts - setupBoardEffect triggered', {
      fen: currentFen,
      hasDeployState: !!this.deployState,
      historyViewIndex: currentHistoryIdx
    });

    if (this.#boardApi) {
      this.#lastSyncedFen = currentFen;
      this.#lastSyncedHistoryIdx = currentHistoryIdx;

      this.#isUpdatingBoard = true;
      this.syncBoard();

      tick().then(() => {
        this.#isUpdatingBoard = false;
      });
    }
  }
}

/**
 * Factory function to create a GameSession (for use in components)
 */
export function createGameSession(fen?: string): GameSession {
  return new GameSession(fen);
}
