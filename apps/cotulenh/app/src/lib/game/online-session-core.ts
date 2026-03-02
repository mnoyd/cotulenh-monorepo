import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { MoveResult } from '@cotulenh/core';
import { logger } from '@cotulenh/common';
import { GameSession } from '$lib/game-session.svelte';
import { ChessClockState, type ClockConfig, type ClockColor } from '$lib/clock/clock.svelte';
import { LagTracker } from '$lib/game/lag-tracker';
import { sendGameMessage, onGameMessage, type GameMessage } from '$lib/game/messages';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';
export type Lifecycle = 'waiting' | 'playing' | 'ended';

const NOSTART_TIMEOUT_MS = 30_000;

export interface OnlineSessionConfig {
  gameId: string;
  playerColor: 'red' | 'blue';
  currentUserId: string;
  opponentUserId: string;
  timeControl: { timeMinutes: number; incrementSeconds: number };
  supabase: SupabaseClient;
}

export interface OnlineSessionCallbacks {
  onStateChange?: () => void;
  onAbort?: () => void;
}

export class OnlineGameSessionCore {
  readonly gameId: string;
  readonly playerColor: 'red' | 'blue';
  readonly session: GameSession;
  readonly clock: ChessClockState;
  readonly #currentUserId: string;
  readonly #opponentUserId: string;

  #supabase: SupabaseClient;
  #channel: RealtimeChannel | null = null;
  #lagTracker = new LagTracker();
  #pendingAcks = new Map<number, number>();
  #presenceId = `presence-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  #connectionState: ConnectionState = 'disconnected';
  #lifecycle: Lifecycle = 'waiting';
  #opponentConnected = false;
  #seqCounter = 0;
  #lastProcessedSeq = 0;
  #noStartTimer: ReturnType<typeof setTimeout> | null = null;
  #hasMoveOccurred = false;
  #abortNotified = false;
  #callbacks: OnlineSessionCallbacks;

  constructor(config: OnlineSessionConfig, callbacks: OnlineSessionCallbacks = {}) {
    this.gameId = config.gameId;
    this.playerColor = config.playerColor;
    this.#currentUserId = config.currentUserId;
    this.#opponentUserId = config.opponentUserId;
    this.#supabase = config.supabase;
    this.#callbacks = callbacks;

    // Create composed GameSession
    this.session = new GameSession();

    // Configure clock from time control
    const clockConfig: ClockConfig = {
      red: {
        initialTime: config.timeControl.timeMinutes * 60 * 1000,
        increment: config.timeControl.incrementSeconds * 1000
      },
      blue: {
        initialTime: config.timeControl.timeMinutes * 60 * 1000,
        increment: config.timeControl.incrementSeconds * 1000
      }
    };
    this.clock = new ChessClockState(clockConfig);

    // Hook into local move events
    this.session.onMove = (san: string) => this.#handleLocalMove(san);
  }

  // State getters
  get connectionState(): ConnectionState { return this.#connectionState; }
  get lifecycle(): Lifecycle { return this.#lifecycle; }
  get opponentConnected(): boolean { return this.#opponentConnected; }
  get seqCounter(): number { return this.#seqCounter; }
  get pendingAckCount(): number { return this.#pendingAcks.size; }

  get myClockColor(): ClockColor {
    return this.playerColor === 'red' ? 'r' : 'b';
  }

  get opponentClockColor(): ClockColor {
    return this.playerColor === 'red' ? 'b' : 'r';
  }

  join(): void {
    if (this.#channel) {
      logger.warn('Already joined game channel');
      return;
    }

    this.#connectionState = 'connecting';
    this.#notifyStateChange();

    const channel = this.#supabase.channel(`game:${this.gameId}`);

    // Register broadcast listener BEFORE subscribe (Supabase requirement)
    onGameMessage(channel, (msg: GameMessage) => this.#handleGameMessage(msg));

    // Add Presence for connection tracking
    channel.on('presence', { event: 'sync' }, () => {
      this.#syncPresence(channel);
    });
    channel.on('presence', { event: 'join' }, () => {
      this.#syncPresence(channel);
    });
    channel.on('presence', { event: 'leave' }, () => {
      this.#syncPresence(channel);
    });

    // Subscribe and track own presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.#connectionState = 'connected';
        this.#lifecycle = 'waiting';
        await channel.track({
          color: this.playerColor,
          userId: this.#currentUserId,
          presenceId: this.#presenceId
        });
        this.#syncPresence(channel);
        this.#notifyStateChange();

        // Start NoStart timeout
        this.#startNoStartTimer();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.#connectionState = 'disconnected';
        this.#notifyStateChange();
      }
    });

    this.#channel = channel;
  }

  destroy(): void {
    this.#clearNoStartTimer();
    this.clock.destroy();
    this.#pendingAcks.clear();

    if (this.#channel) {
      this.#supabase.removeChannel(this.#channel);
      this.#channel = null;
    }

    this.#connectionState = 'disconnected';
  }

  // ============================================================
  // PRIVATE - Local move handler
  // ============================================================

  #handleLocalMove(san: string): void {
    if (!this.#channel || this.#connectionState !== 'connected') {
      logger.warn('Cannot send move: not connected');
      return;
    }
    if (!this.#opponentConnected || this.#lifecycle !== 'playing') {
      logger.warn('Cannot send move: game not started', {
        opponentConnected: this.#opponentConnected,
        lifecycle: this.#lifecycle
      });
      return;
    }

    this.#clearNoStartTimerOnFirstMove();

    // Start clock on first move
    if (this.clock.status === 'idle') {
      this.clock.start('r'); // Red always moves first
      this.#lifecycle = 'playing';
    }

    // Read clock time before broadcasting
    const myTime = this.clock.getTime(this.myClockColor);

    // Broadcast move
    const seq = ++this.#seqCounter;
    this.#pendingAcks.set(seq, Date.now());
    sendGameMessage(this.#channel, {
      event: 'move',
      senderId: this.#currentUserId,
      san,
      clock: myTime,
      seq,
      sentAt: Date.now()
    });

    // Switch clock side
    this.clock.switchSide();
    this.#notifyStateChange();
  }

  // ============================================================
  // PRIVATE - Remote message handlers
  // ============================================================

  #handleGameMessage(msg: GameMessage): void {
    if (msg.senderId === this.#currentUserId) {
      return;
    }
    if (msg.senderId !== this.#opponentUserId) {
      logger.warn('Ignoring game message from unexpected sender', {
        senderId: msg.senderId,
        expectedSenderId: this.#opponentUserId
      });
      return;
    }

    switch (msg.event) {
      case 'move':
        this.#handleRemoteMove(msg);
        break;
      case 'ack':
        this.#handleAck(msg);
        break;
      case 'abort':
        this.#handleAbortMessage();
        break;
      // Other message types will be handled by later stories (5.3-5.7)
      default:
        break;
    }
  }

  #handleRemoteMove(msg: Extract<GameMessage, { event: 'move' }>): void {
    if (!this.#channel) return;

    // Send ack immediately
    sendGameMessage(this.#channel, {
      event: 'ack',
      senderId: this.#currentUserId,
      seq: msg.seq
    });

    // Skip duplicate
    if (msg.seq <= this.#lastProcessedSeq) {
      logger.debug('Skipping duplicate move', { seq: msg.seq, lastProcessed: this.#lastProcessedSeq });
      return;
    }

    this.#clearNoStartTimerOnFirstMove();

    // Start clock on first move if not yet started
    if (this.clock.status === 'idle') {
      this.clock.start('r'); // Red always moves first
      this.#lifecycle = 'playing';
    }

    // Compute lag compensation
    const lag = Date.now() - msg.sentAt;
    const compensation = this.#lagTracker.debit(lag);
    const adjustedClock = msg.clock + compensation;

    // Apply remote move (does NOT fire onMove callback)
    const result = this.session.applyMove(msg.san);

    if (result) {
      // Update opponent's clock with lag compensation
      this.clock.setTime(this.opponentClockColor, adjustedClock);
      this.clock.switchSide();
      this.#lagTracker.regenerate();
      this.#lastProcessedSeq = msg.seq;
      this.#notifyStateChange();
    } else {
      // Invalid move — log error (dispute handling is Story 5.6)
      logger.error('Received invalid remote move', { san: msg.san, seq: msg.seq });
    }
  }

  #handleAck(msg: Extract<GameMessage, { event: 'ack' }>): void {
    const wasPending = this.#pendingAcks.delete(msg.seq);
    logger.debug('Received ack', { seq: msg.seq, wasPending });
  }

  #handleAbortMessage(): void {
    if (this.#lifecycle === 'ended') return;
    this.#clearNoStartTimer();
    this.#lifecycle = 'ended';
    this.#notifyStateChange();
    this.#notifyAbortOnce();
  }

  // ============================================================
  // PRIVATE - NoStart timeout
  // ============================================================

  #startNoStartTimer(): void {
    this.#clearNoStartTimer();
    this.#noStartTimer = setTimeout(() => {
      this.#handleNoStartTimeout();
    }, NOSTART_TIMEOUT_MS);
  }

  #clearNoStartTimer(): void {
    if (this.#noStartTimer) {
      clearTimeout(this.#noStartTimer);
      this.#noStartTimer = null;
    }
  }

  #clearNoStartTimerOnFirstMove(): void {
    if (!this.#hasMoveOccurred) {
      this.#hasMoveOccurred = true;
      this.#clearNoStartTimer();
    }
  }

  async #handleNoStartTimeout(): Promise<void> {
    this.#clearNoStartTimer();
    this.#lifecycle = 'ended';
    this.#notifyStateChange();

    // Update game status to aborted in database
    const { error } = await this.#supabase
      .from('games')
      .update({ status: 'aborted' })
      .eq('id', this.gameId);

    if (error) {
      logger.error('Failed to abort game', { gameId: this.gameId, error });
    }

    // Notify via broadcast
    if (this.#channel) {
      sendGameMessage(this.#channel, {
        event: 'abort',
        senderId: this.#currentUserId
      });
    }

    this.#notifyAbortOnce();
  }

  // ============================================================
  // PRIVATE - Presence
  // ============================================================

  #syncPresence(channel: RealtimeChannel): void {
    const state = channel.presenceState();
    // Count presences that are NOT this client instance.
    let opponentFound = false;
    for (const key of Object.keys(state)) {
      const presences = state[key];
      for (const p of presences) {
        const presence = p as Record<string, unknown>;
        if (
          presence.presenceId !== this.#presenceId &&
          typeof presence.userId === 'string' &&
          presence.userId === this.#opponentUserId
        ) {
          opponentFound = true;
          break;
        }
      }
      if (opponentFound) break;
    }
    this.#opponentConnected = opponentFound;
    this.#startGameWhenReady();
    this.#notifyStateChange();
  }

  // ============================================================
  // PRIVATE - State change notification
  // ============================================================

  #notifyStateChange(): void {
    this.#callbacks.onStateChange?.();
  }

  #notifyAbortOnce(): void {
    if (this.#abortNotified) return;
    this.#abortNotified = true;
    this.#callbacks.onAbort?.();
  }

  #startGameWhenReady(): void {
    if (!this.#opponentConnected || this.#lifecycle !== 'waiting') return;
    this.#lifecycle = 'playing';
    if (this.clock.status === 'idle') {
      this.clock.start('r');
    }
  }
}
