import { tick } from 'svelte';
import {
  logger,
  perfStart,
  perfTimeSync,
  perfStartMoveFlow,
  perfMarkMoveFlow,
  perfEndMoveFlow,
  MoveFlowPhase
} from '@cotulenh/common';
import { logRender } from '$lib/debug';
import type { Api, Config, DestMove, OrigMove, Key } from '@cotulenh/board';
import { CoTuLenh, BLUE, RED, type CoTuLenhInterface, type DeployStateView } from '@cotulenh/core';
import type { Color, Square, MoveResult } from '@cotulenh/core';
import { makeCoreMove } from '$lib/utils';
import { toast } from 'svelte-sonner';
import {
  coreToBoardColor,
  coreToBoardCheck,
  mapPossibleMovesToDests,
  mapLastMoveToBoardFormat
} from '$lib/features/game/utils.js';
import type { GameStatus, HistoryMove } from '$lib/types/game';
import { extractLastMoveSquares } from './game-session-helpers';
import { playSound } from '$lib/utils/audio';
import { loadSettings } from '$lib/stores/settings';

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
  #game: CoTuLenhInterface;

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

  // Memoization for expensive move computation
  #cachedPossibleMoves: MoveResult[] = [];
  #lastMovesVersion = -1;

  // Event callbacks
  #onMove: (() => void) | null = null;

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
    // Don't check for game ended mid deploy session - the session hasn't been committed yet
    const session = this.#game.getSession();
    if (session && session.isDeploy) {
      return 'playing';
    }

    // All CoTuLenh instances have these methods
    if (this.#game.isGameOver()) {
      if (this.#game.isCheckmate()) return 'checkmate';
      if (this.#game.isStalemate()) return 'stalemate';
      if (this.#game.isDraw()) return 'draw';
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

    // Return cached moves if version unchanged
    if (this.#lastMovesVersion === this.#version) {
      return this.#cachedPossibleMoves;
    }

    // Compute and cache with performance tracking
    const endPerf = perfStart('moves');
    this.#cachedPossibleMoves = this.#game.moves({ verbose: true }) as MoveResult[];
    this.#lastMovesVersion = this.#version;
    endPerf();
    return this.#cachedPossibleMoves;
  }

  get deployState(): DeployStateView | null {
    void this.#version;
    return this.#game.getDeployState();
  }

  get originalFen(): string | undefined {
    return this.#originalFen;
  }

  get pgn(): string {
    void this.#version;
    return this.#game.pgn();
  }

  get isViewingHistory(): boolean {
    return this.#historyViewIndex !== -1;
  }

  /**
   * Check if there's anything to undo (for UI state only).
   * Note: undo() itself is safe to call anytime - it's a no-op if nothing to undo.
   */
  get canUndo(): boolean {
    void this.#version;
    const session = this.#game.getSession();
    return this.#history.length > 0 || (session !== null && !session.isEmpty);
  }

  get canCommitSession(): boolean {
    void this.#version;
    return this.#game.canCommitSession();
  }

  get hasPendingSession(): boolean {
    void this.#version;
    return this.#game.getSession() !== null;
  }

  get isDeploySession(): boolean {
    void this.#version;
    const session = this.#game.getSession();
    return session !== null && session.isDeploy;
  }

  set onMove(callback: (() => void) | null) {
    this.#onMove = callback;
  }

  // ============================================================
  // BOARD CONFIGURATION - Derived config for the board component
  // ============================================================

  get boardConfig(): Config {
    const settings = loadSettings();
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
        showDeployButtons: settings.showDeployButtons,
        events: {
          after: (orig: OrigMove, dest: DestMove) => this.#handleMove(orig, dest),
          session: {
            cancel: () => this.cancelDeploy(),
            complete: () => this.commitDeploy()
          }
        }
      }
    };
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
    const endPerf = perfStart('game:sync-board', {
      hasBoardApi: !!this.#boardApi,
      turnColor: this.turn
    });

    // Mark board render phase in move flow
    perfMarkMoveFlow(MoveFlowPhase.BoardRender, { fen: this.fen });

    logRender('🔄 [RENDER] game-session.svelte.ts - syncBoard() called', {
      hasBoardApi: !!this.#boardApi,
      turnColor: this.turn,
      fen: this.fen
    });
    if (this.#boardApi) {
      this.#boardApi.set(this.boardConfig);
    }

    endPerf();
  }

  // ============================================================
  // ACTION METHODS - Mutate game and bump version
  // ============================================================

  #playMoveSound(moveResult: MoveResult): void {
    if (this.#game.isCheckmate() || this.#game.isStalemate() || this.#game.isDraw()) {
      playSound('gameEnd');
    } else if (this.#game.isCheck()) {
      playSound('check');
    } else if (moveResult.captured) {
      playSound('capture');
    } else {
      playSound('move');
    }
  }

  #handleMove(orig: OrigMove, dest: DestMove): void {
    if (this.#isUpdatingBoard) {
      logger.warn('Move attempted while board is updating, ignoring');
      return;
    }

    // Start move flow tracking
    perfStartMoveFlow({ from: orig.square, to: dest.square });
    perfMarkMoveFlow(MoveFlowPhase.BoardToApp, { from: orig.square, to: dest.square });
    perfMarkMoveFlow(MoveFlowPhase.AppReceive);

    const endPerf = perfStart('game:move', { orig, dest });

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

      perfMarkMoveFlow(MoveFlowPhase.AppToCore);

      const moveResult = perfTimeSync('game:move:core', () => {
        perfMarkMoveFlow(MoveFlowPhase.CoreMove);
        const result = makeCoreMove(this.#game, orig, dest);
        perfMarkMoveFlow(MoveFlowPhase.CoreToApp);
        return result;
      });

      perfMarkMoveFlow(MoveFlowPhase.AppProcess);

      if (moveResult) {
        const session = this.#game.getSession();
        const isDeploySession = session && session.isDeploy;

        // Only add to history if not in an active deploy session
        if (!isDeploySession) {
          this.#history = [...this.#history, moveResult as HistoryMove];
          this.#playMoveSound(moveResult);
          this.#onMove?.();
        } else {
          // Check for auto-complete deploy when no pieces remaining
          const settings = loadSettings();
          const deployState = this.#game.getDeployState();
          if (
            settings.autoCompleteDeploy &&
            deployState &&
            deployState.remainingPieces.length === 0
          ) {
            this.commitDeploy();
            return;
          }
        }
        this.#version++;

        perfMarkMoveFlow(MoveFlowPhase.AppToBoard);
      } else {
        logger.warn('Illegal move attempted on board', { orig, dest });
        toast.error('Illegal move');
        perfEndMoveFlow({ success: false, reason: 'illegal' });
        return;
      }
    } catch (error) {
      logger.error('Error making move in game engine:', { error });
      toast.error('Move failed');
      this.syncBoard();
      perfEndMoveFlow({ success: false, error });
      return;
    } finally {
      endPerf();
    }

    // End move flow tracking (board sync will happen in the effect)
    perfEndMoveFlow({ success: true });
  }

  undo(): void {
    const endPerf = perfStart('game:undo');
    try {
      const session = this.#game.getSession();

      this.#game.undo();

      // Only pop history if we're NOT in a deploy session
      if (!session && this.#history.length > 0) {
        this.#history = this.#history.slice(0, -1);
      }

      this.#historyViewIndex = -1;
      this.#version++;
      toast.info('Undo successful');
    } catch (error) {
      logger.error('Failed to undo move:', { error });
      toast.error('Undo failed');
    } finally {
      endPerf();
    }
  }

  reset(): void {
    const endPerf = perfStart('game:reset');
    try {
      this.#game = this.#originalFen ? new CoTuLenh(this.#originalFen) : new CoTuLenh();
      this.#history = [];
      this.#historyViewIndex = -1;
      this.#version++;
      toast.success('Game reset');
    } catch (error) {
      logger.error('Failed to reset game:', { error });
      toast.error('Reset failed');
    } finally {
      endPerf();
    }
  }

  commitSession(): void {
    const endPerf = perfStart('session:commit');
    try {
      const session = this.#game.getSession();
      if (!session) {
        logger.error('❌ No session active');
        return;
      }

      const result = this.#game.commitSession();

      if (!result.success || !result.result) {
        const reason = result.reason || 'Unknown error';
        logger.error('❌ Failed to commit:', reason);
        toast.error(`Cannot commit move: ${reason}`);
        return;
      }

      this.#history = [...this.#history, result.result as HistoryMove];
      this.#playMoveSound(result.result);
      this.#onMove?.();
      this.#version++;
    } catch (error) {
      logger.error('❌ Failed to commit session:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Cannot commit move: ${errorMsg}`);
    } finally {
      endPerf();
    }
  }

  commitDeploy(): void {
    this.commitSession();
  }

  cancelSession(): void {
    const endPerf = perfStart('session:cancel');
    try {
      this.#game.cancelSession();
      this.#version++;
    } catch (error) {
      logger.error('❌ Failed to cancel session:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error cancelling: ${errorMsg}`);
    } finally {
      endPerf();
    }
  }

  cancelDeploy(): void {
    this.cancelSession();
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
        this.undo();
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

    const endPerf = perfStart('render:effect', {
      fen: currentFen,
      hasDeployState: !!this.deployState,
      historyViewIndex: currentHistoryIdx
    });

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

    endPerf();
  }
}

/**
 * Factory function to create a GameSession (for use in components)
 */
export function createGameSession(fen?: string): GameSession {
  return new GameSession(fen);
}
