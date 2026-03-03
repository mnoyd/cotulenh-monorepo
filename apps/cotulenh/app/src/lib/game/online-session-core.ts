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
  redPlayerName: string;
  bluePlayerName: string;
}

export interface GameEndResult {
  status: string;
  winner: 'red' | 'blue' | null;
  resultReason: string;
  isLocalPlayerWinner: boolean;
}

export interface SyncErrorContext {
  pgn: string;
  fen: string;
  gameId: string;
  error?: unknown;
}

export interface OnlineSessionCallbacks {
  onStateChange?: () => void;
  onAbort?: () => void;
  onSyncError?: (context: SyncErrorContext) => void;
  onGameEnd?: (result: GameEndResult) => void;
}

export class OnlineGameSessionCore {
  readonly gameId: string;
  readonly playerColor: 'red' | 'blue';
  readonly session: GameSession;
  readonly clock: ChessClockState;
  readonly #currentUserId: string;
  readonly #opponentUserId: string;
  readonly #redPlayerName: string;
  readonly #bluePlayerName: string;
  readonly #timeControlMinutes: number;
  readonly #timeControlIncrement: number;

  #supabase: SupabaseClient;
  #channel: RealtimeChannel | null = null;
  #lagTracker = new LagTracker();
  #pendingAcks = new Map<number, { timer: ReturnType<typeof setTimeout>; message: GameMessage }>();
  #presenceId = `presence-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  #connectionState: ConnectionState = 'disconnected';
  #lifecycle: Lifecycle = 'waiting';
  #opponentConnected = false;
  #seqCounter = 0;
  #lastProcessedSeq = 0;
  #awaitingSync = false;
  #opponentWasDisconnected = false;
  #noStartTimer: ReturnType<typeof setTimeout> | null = null;
  #hasMoveOccurred = false;
  #abortNotified = false;
  #callbacks: OnlineSessionCallbacks;
  #clockAnnotations: string[] = [];
  #gameResult: GameEndResult | null = null;

  constructor(config: OnlineSessionConfig, callbacks: OnlineSessionCallbacks = {}) {
    this.gameId = config.gameId;
    this.playerColor = config.playerColor;
    this.#currentUserId = config.currentUserId;
    this.#opponentUserId = config.opponentUserId;
    this.#supabase = config.supabase;
    this.#callbacks = callbacks;
    this.#redPlayerName = config.redPlayerName;
    this.#bluePlayerName = config.bluePlayerName;
    this.#timeControlMinutes = config.timeControl.timeMinutes;
    this.#timeControlIncrement = config.timeControl.incrementSeconds;

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
  get awaitingSync(): boolean { return this.#awaitingSync; }

  get myClockColor(): ClockColor {
    return this.playerColor === 'red' ? 'r' : 'b';
  }

  get opponentClockColor(): ClockColor {
    return this.playerColor === 'red' ? 'b' : 'r';
  }

  get clockAnnotations(): string[] {
    return this.#clockAnnotations;
  }

  get gameResult(): GameEndResult | null {
    return this.#gameResult;
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
        this.#clearAllPendingAcks();
        this.#notifyStateChange();
      }
    });

    this.#channel = channel;
  }

  resign(): void {
    if (!this.#channel || this.#lifecycle !== 'playing') return;

    sendGameMessage(this.#channel, {
      event: 'resign',
      senderId: this.#currentUserId
    });

    const winner = this.playerColor === 'red' ? 'blue' : 'red';
    this.clock.stop();
    this.#lifecycle = 'ended';
    this.#gameResult = {
      status: 'resign',
      winner,
      resultReason: 'resignation',
      isLocalPlayerWinner: false
    };
    this.#writeGameResult('resign', winner, 'resignation');
    this.#callbacks.onGameEnd?.(this.#gameResult);
    this.#notifyStateChange();
  }

  destroy(): void {
    this.#clearNoStartTimer();
    this.clock.destroy();
    this.#clearAllPendingAcks();

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
    if (this.#lifecycle !== 'playing') {
      logger.warn('Cannot send move: game not started', {
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

    // Read clock time before broadcasting and record annotation
    const myTime = this.clock.getTime(this.myClockColor);
    this.#clockAnnotations.push(this.#formatClockAnnotation(myTime));

    // Broadcast move with retry
    const seq = ++this.#seqCounter;
    const message: GameMessage = {
      event: 'move',
      senderId: this.#currentUserId,
      san,
      clock: myTime,
      seq,
      sentAt: Date.now()
    };
    sendGameMessage(this.#channel, message);
    this.#startAckRetry(seq, message);

    // Switch clock side
    this.clock.switchSide();
    this.#notifyStateChange();

    // Check if this move ended the game
    this.#checkGameEnd();
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
      case 'sync-request':
        this.#handleSyncRequest();
        break;
      case 'sync':
        this.#handleSync(msg);
        break;
      case 'resign':
        this.#handleResignMessage();
        break;
      case 'abort':
        this.#handleAbortMessage();
        break;
      default:
        break;
    }
  }

  #handleRemoteMove(msg: Extract<GameMessage, { event: 'move' }>): void {
    if (!this.#channel) return;

    // While awaiting sync, ignore all move messages (sync will reconcile)
    if (this.#awaitingSync) {
      if (msg.seq >= this.#lastProcessedSeq + 1) {
        this.#requestSyncFromOpponent(this.#channel, msg.seq);
      }
      logger.debug('Ignoring move while awaiting sync', { seq: msg.seq });
      return;
    }

    // Skip duplicate
    if (msg.seq <= this.#lastProcessedSeq) {
      this.#sendAck(msg.seq);
      logger.debug('Skipping duplicate move', { seq: msg.seq, lastProcessed: this.#lastProcessedSeq });
      return;
    }

    // Gap detection: if seq is ahead by more than 1, request sync
    if (msg.seq > this.#lastProcessedSeq + 1) {
      logger.warn('Seq gap detected — awaiting sync', {
        received: msg.seq,
        expected: this.#lastProcessedSeq + 1
      });
      this.#awaitingSync = true;
      this.#requestSyncFromOpponent(this.#channel, msg.seq);
      this.#notifyStateChange();
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
      // Record clock annotation for remote move
      this.#clockAnnotations.push(this.#formatClockAnnotation(adjustedClock));

      // Update opponent's clock with lag compensation
      this.clock.setTime(this.opponentClockColor, adjustedClock);
      this.clock.switchSide();
      this.#lagTracker.regenerate();
      this.#lastProcessedSeq = msg.seq;
      this.#sendAck(msg.seq);
      this.#notifyStateChange();

      // Check if this move ended the game
      this.#checkGameEnd();
    } else {
      // Invalid move — log error (dispute handling is Story 5.6)
      logger.error('Received invalid remote move', { san: msg.san, seq: msg.seq });
      this.#awaitingSync = true;
      this.#requestSyncFromOpponent(this.#channel, msg.seq);
      this.#notifyStateChange();
    }
  }

  #handleAck(msg: Extract<GameMessage, { event: 'ack' }>): void {
    const entry = this.#pendingAcks.get(msg.seq);
    if (entry) {
      clearTimeout(entry.timer);
      this.#pendingAcks.delete(msg.seq);
    }
    logger.debug('Received ack', { seq: msg.seq, wasPending: !!entry });
  }

  #handleSync(msg: Extract<GameMessage, { event: 'sync' }>): void {
    const loaded = this.session.loadFromSync(msg.pgn);
    if (!loaded) {
      this.#callbacks.onSyncError?.({
        pgn: msg.pgn,
        fen: this.session.game.fen(),
        gameId: this.gameId,
        error: 'PGN load failed'
      });
      return;
    }

    // State fully reconciled — update clocks, seq, and clear pending acks
    this.clock.setTime('r', msg.clock.red);
    this.clock.setTime('b', msg.clock.blue);
    this.#lastProcessedSeq = msg.seq;
    this.#awaitingSync = false;
    this.#clockAnnotations = [];
    this.#clearAllPendingAcks();
    this.#notifyStateChange();
  }

  #handleSyncRequest(): void {
    if (!this.#channel || this.#lifecycle !== 'playing') return;
    this.#sendSyncToOpponent(this.#channel);
  }

  #handleAbortMessage(): void {
    if (this.#lifecycle === 'ended') return;
    this.#clearNoStartTimer();
    this.#lifecycle = 'ended';
    this.#notifyStateChange();
    this.#notifyAbortOnce();
  }

  // ============================================================
  // PRIVATE - Ack retry
  // ============================================================

  #startAckRetry(seq: number, message: GameMessage): void {
    const timer = setTimeout(() => {
      if (!this.#channel || this.#connectionState !== 'connected') return;
      logger.debug('Retrying unacked move', { seq });
      sendGameMessage(this.#channel, message);
      // Restart retry timer
      this.#startAckRetry(seq, message);
    }, 3000);
    this.#pendingAcks.set(seq, { timer, message });
  }

  #sendAck(seq: number): void {
    if (!this.#channel) return;
    sendGameMessage(this.#channel, {
      event: 'ack',
      senderId: this.#currentUserId,
      seq
    });
  }

  #requestSyncFromOpponent(channel: RealtimeChannel, receivedSeq: number): void {
    sendGameMessage(channel, {
      event: 'sync-request',
      senderId: this.#currentUserId,
      expectedSeq: this.#lastProcessedSeq + 1
    });
    logger.debug('Requested sync from opponent', {
      expectedSeq: this.#lastProcessedSeq + 1,
      receivedSeq
    });
  }

  #clearAllPendingAcks(): void {
    for (const entry of this.#pendingAcks.values()) {
      clearTimeout(entry.timer);
    }
    this.#pendingAcks.clear();
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
    const wasConnected = this.#opponentConnected;

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

    // Track disconnect for sync-on-reconnect
    if (!opponentFound && wasConnected) {
      this.#opponentWasDisconnected = true;
    }

    // Send sync when opponent reconnects after a disconnect during active play
    if (opponentFound && this.#opponentWasDisconnected && this.#lifecycle === 'playing') {
      this.#opponentWasDisconnected = false;
      this.#sendSyncToOpponent(channel);
    }

    this.#startGameWhenReady();
    this.#notifyStateChange();
  }

  // ============================================================
  // PRIVATE - Sync send
  // ============================================================

  #sendSyncToOpponent(channel: RealtimeChannel): void {
    let pgn: string;
    try {
      pgn = this.session.pgn;
    } catch (error) {
      logger.error('PGN export failed during sync send', { error, gameId: this.gameId });
      return; // skip sync — retry/reconnect will attempt again
    }

    sendGameMessage(channel, {
      event: 'sync',
      senderId: this.#currentUserId,
      fen: this.session.game.fen(),
      pgn,
      clock: {
        red: this.clock.getTime('r'),
        blue: this.clock.getTime('b')
      },
      seq: this.#seqCounter
    });
  }

  // ============================================================
  // PRIVATE - Game end detection, resign, result writing
  // ============================================================

  #checkGameEnd(): void {
    if (this.session.status === 'playing') return;
    if (this.#lifecycle === 'ended') return;

    const engineStatus = this.session.status;
    let dbStatus: string;
    let resultReason: string;

    if (this.session.game.isCommanderCaptured()) {
      dbStatus = 'checkmate';
      resultReason = 'commander_captured';
    } else if (this.session.game.isCheckmate()) {
      dbStatus = 'checkmate';
      resultReason = 'checkmate';
    } else if (this.session.game.isStalemate()) {
      dbStatus = 'stalemate';
      resultReason = 'stalemate';
    } else if (this.session.game.isDrawByFiftyMoves()) {
      dbStatus = 'draw';
      resultReason = 'fifty_moves';
    } else if (this.session.game.isThreefoldRepetition()) {
      dbStatus = 'draw';
      resultReason = 'threefold_repetition';
    } else if (engineStatus === 'draw') {
      dbStatus = 'draw';
      resultReason = 'draw';
    } else {
      dbStatus = engineStatus;
      resultReason = engineStatus;
    }

    // Determine winner from engine: after the ending move, turn() returns the losing side
    const engineWinner = this.session.winner;
    const dbWinner = engineWinner === 'r' ? 'red' : engineWinner === 'b' ? 'blue' : null;

    this.clock.stop();
    this.#lifecycle = 'ended';
    this.#gameResult = {
      status: dbStatus,
      winner: dbWinner,
      resultReason,
      isLocalPlayerWinner: dbWinner === this.playerColor
    };
    this.#writeGameResult(dbStatus, dbWinner, resultReason);
    this.#callbacks.onGameEnd?.(this.#gameResult);
    this.#notifyStateChange();
  }

  #handleResignMessage(): void {
    if (this.#lifecycle === 'ended') return;

    const winner = this.playerColor; // Local player wins when opponent resigns
    this.clock.stop();
    this.#lifecycle = 'ended';
    this.#gameResult = {
      status: 'resign',
      winner,
      resultReason: 'resignation',
      isLocalPlayerWinner: true
    };
    this.#writeGameResult('resign', winner, 'resignation');
    this.#callbacks.onGameEnd?.(this.#gameResult);
    this.#notifyStateChange();
  }

  async #writeGameResult(status: string, winner: string | null, resultReason: string): Promise<void> {
    try {
      // Set PGN headers before export
      const game = this.session.game;
      game.setHeader('Red', this.#redPlayerName);
      game.setHeader('Blue', this.#bluePlayerName);
      game.setHeader('Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'));
      game.setHeader('TimeControl', `${this.#timeControlMinutes * 60}+${this.#timeControlIncrement}`);

      let terminationString: string;
      switch (resultReason) {
        case 'checkmate': terminationString = 'checkmate'; break;
        case 'commander_captured': terminationString = 'commander captured'; break;
        case 'stalemate': terminationString = 'stalemate'; break;
        case 'resignation': terminationString = 'resignation'; break;
        case 'fifty_moves': terminationString = 'fifty move rule'; break;
        case 'threefold_repetition': terminationString = 'threefold repetition'; break;
        default: terminationString = resultReason; break;
      }
      game.setHeader('Termination', terminationString);

      // For resign, manually set Result since engine doesn't know about resignation
      if (status === 'resign') {
        game.setHeader('Result', winner === 'red' ? '1-0' : '0-1');
      }

      // Core engine accepts `clocks` but interface type doesn't expose it
      const fullPgn = (game as unknown as { pgn(opts: { clocks?: string[] }): string }).pgn({ clocks: this.#clockAnnotations });

      const { error, count } = await this.#supabase
        .from('games')
        .update(
          {
            status,
            winner,
            result_reason: resultReason,
            pgn: fullPgn,
            ended_at: new Date().toISOString()
          },
          { count: 'exact' }
        )
        .eq('id', this.gameId)
        .eq('status', 'started');

      if (error) {
        logger.error('Failed to write game result', { gameId: this.gameId, error });
      } else if (count === 0) {
        logger.info('Game result already written by other client', { gameId: this.gameId });
      }
    } catch (error) {
      logger.error('Error writing game result', { gameId: this.gameId, error });
    }
  }

  #formatClockAnnotation(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
