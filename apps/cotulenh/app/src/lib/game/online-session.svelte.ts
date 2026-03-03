/**
 * Reactive OnlineGameSession wrapper — uses Svelte 5 $state to make
 * online game state reactive in components. Core logic lives in online-session-core.ts.
 */
import {
  OnlineGameSessionCore,
  type OnlineSessionConfig,
  type ConnectionState,
  type Lifecycle,
  type SyncErrorContext
} from './online-session-core';
import type { GameSession } from '$lib/game-session.svelte';
import type { ChessClockState, ClockColor } from '$lib/clock/clock.svelte';
import type { Color, MoveResult } from '@cotulenh/core';
import type { GameStatus, HistoryMove } from '$lib/types/game';
import type { DeployStateView } from '@cotulenh/core';

export class OnlineGameSession {
  #core: OnlineGameSessionCore;

  // Reactive state mirroring core
  #connectionState = $state<ConnectionState>('disconnected');
  #lifecycle = $state<Lifecycle>('waiting');
  #opponentConnected = $state(false);
  #seqCounter = $state(0);
  #awaitingSync = $state(false);

  // Reactive proxies for GameSession state (updated via version bump)
  #version = $state(0);

  constructor(
    config: OnlineSessionConfig,
    onAbort?: () => void,
    onSyncError?: (context: SyncErrorContext) => void
  ) {
    this.#core = new OnlineGameSessionCore(config, {
      onStateChange: () => this.#syncState(),
      onAbort,
      onSyncError
    });
  }

  // ============================================================
  // Online session state (reactive)
  // ============================================================

  get connectionState(): ConnectionState { return this.#connectionState; }
  get lifecycle(): Lifecycle { return this.#lifecycle; }
  get opponentConnected(): boolean { return this.#opponentConnected; }
  get seqCounter(): number { return this.#seqCounter; }
  get awaitingSync(): boolean { return this.#awaitingSync; }
  get playerColor(): 'red' | 'blue' { return this.#core.playerColor; }
  get gameId(): string { return this.#core.gameId; }
  get myClockColor(): ClockColor { return this.#core.myClockColor; }
  get opponentClockColor(): ClockColor { return this.#core.opponentClockColor; }

  // ============================================================
  // Proxied GameSession reactive properties
  // ============================================================

  get fen(): string {
    void this.#version;
    return this.#core.session.fen;
  }

  get turn(): Color | null {
    void this.#version;
    return this.#core.session.turn;
  }

  get status(): GameStatus {
    void this.#version;
    return this.#core.session.status;
  }

  get history(): HistoryMove[] {
    void this.#version;
    return this.#core.session.history;
  }

  get possibleMoves(): MoveResult[] {
    void this.#version;
    return this.#core.session.possibleMoves;
  }

  get lastMove() {
    void this.#version;
    return this.#core.session.lastMove;
  }

  get check(): boolean {
    void this.#version;
    return this.#core.session.check;
  }

  get winner(): Color | null {
    void this.#version;
    return this.#core.session.winner;
  }

  get deployState(): DeployStateView | null {
    void this.#version;
    return this.#core.session.deployState;
  }

  get pgn(): string {
    void this.#version;
    return this.#core.session.pgn;
  }

  // ============================================================
  // Proxied ChessClockState reactive properties
  // ============================================================

  get redTime(): number {
    void this.#version;
    return this.#core.clock.redTime;
  }

  get blueTime(): number {
    void this.#version;
    return this.#core.clock.blueTime;
  }

  get activeSide(): ClockColor | null {
    void this.#version;
    return this.#core.clock.activeSide;
  }

  get clockStatus() {
    void this.#version;
    return this.#core.clock.status;
  }

  // ============================================================
  // Direct access for board component integration
  // ============================================================

  get session(): GameSession { return this.#core.session; }
  get clock(): ChessClockState { return this.#core.clock; }

  // ============================================================
  // Actions
  // ============================================================

  join(): void {
    this.#core.join();
  }

  destroy(): void {
    this.#core.destroy();
  }

  // ============================================================
  // Private - state sync
  // ============================================================

  #syncState(): void {
    this.#connectionState = this.#core.connectionState;
    this.#lifecycle = this.#core.lifecycle;
    this.#opponentConnected = this.#core.opponentConnected;
    this.#seqCounter = this.#core.seqCounter;
    this.#awaitingSync = this.#core.awaitingSync;
    this.#version++;
  }
}
