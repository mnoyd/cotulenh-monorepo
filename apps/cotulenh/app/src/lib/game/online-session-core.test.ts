import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('svelte-sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() }
}));

vi.mock('@cotulenh/common', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    perfStart: () => () => {},
    perfTimeSync: (_label: string, fn: () => unknown) => fn(),
    perfStartMoveFlow: () => {},
    perfMarkMoveFlow: () => {},
    perfEndMoveFlow: () => {},
  };
});

vi.mock('$lib/utils/audio', () => ({
  playSound: vi.fn()
}));

vi.mock('$lib/stores/settings', () => ({
  loadSettings: () => ({ showDeployButtons: true, autoCompleteDeploy: false })
}));

vi.mock('$lib/i18n/index.svelte', () => ({
  t: (key: string) => key
}));

vi.mock('$lib/debug', () => ({
  logRender: vi.fn()
}));

import { OnlineGameSessionCore, type OnlineSessionConfig } from './online-session-core';
import type { RealtimeChannel } from '@supabase/supabase-js';

const CURRENT_USER_ID = 'user-red';
const OPPONENT_USER_ID = 'user-blue';

// Helper to create a mock Supabase client
function createMockSupabase() {
  const channelHandlers: Record<string, Function[]> = {};
  let subscribeCallback: Function | null = null;
  let trackData: Record<string, unknown> | null = null;
  const presenceState: Record<string, Array<Record<string, unknown>>> = {};

  const mockChannel: Record<string, unknown> = {
    on: vi.fn((type: string, opts: Record<string, unknown>, handler: Function) => {
      const key = type === 'broadcast' ? `broadcast:${opts.event}` : `${type}:${opts.event}`;
      if (!channelHandlers[key]) channelHandlers[key] = [];
      channelHandlers[key].push(handler);
      return mockChannel;
    }),
    subscribe: vi.fn((cb: Function) => {
      subscribeCallback = cb;
      // Auto-connect
      setTimeout(() => cb('SUBSCRIBED'), 0);
      return mockChannel;
    }),
    track: vi.fn(async (data: Record<string, unknown>) => {
      trackData = data;
    }),
    send: vi.fn(async () => 'ok'),
    presenceState: vi.fn(() => presenceState),
    unsubscribe: vi.fn()
  };

  let updateResult = { error: null as null | Error, count: 1 };
  let lastUpdateValues: Record<string, unknown> | null = null;
  let lastUpdateOptions: Record<string, unknown> | null = null;
  const eqFilters: Array<{ column: string; value: unknown }> = [];

  const supabase = {
    channel: vi.fn(() => mockChannel as unknown as RealtimeChannel),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      update: vi.fn((values?: Record<string, unknown>, options?: Record<string, unknown>) => {
        lastUpdateValues = values ?? null;
        lastUpdateOptions = options ?? null;
        eqFilters.length = 0;

        return {
          eq: vi.fn((column: string, value: unknown) => {
            eqFilters.push({ column, value });
            return {
              eq: vi.fn(async (innerColumn: string, innerValue: unknown) => {
                eqFilters.push({ column: innerColumn, value: innerValue });
                return { error: updateResult.error, count: updateResult.count };
              })
            };
          })
        };
      })
    }))
  };

  return {
    supabase: supabase as unknown as Parameters<typeof OnlineGameSessionCore['prototype']['join']> extends [] ? never : typeof supabase,
    mockChannel,
    channelHandlers,
    presenceState,
    getSubscribeCallback: () => subscribeCallback,
    getTrackData: () => trackData,
    // Helper to simulate receiving a game message
    simulateGameMessage: (payload: Record<string, unknown>) => {
      const withSender = { senderId: OPPONENT_USER_ID, ...payload };
      const handlers = channelHandlers['broadcast:game-message'] ?? [];
      for (const handler of handlers) {
        handler({ payload: withSender });
      }
    },
    // Helper to set the DB update result for testing optimistic concurrency
    setUpdateResult: (result: { error: null | Error; count: number }) => {
      updateResult = result;
    },
    getLastUpdateValues: () => lastUpdateValues,
    getLastUpdateOptions: () => lastUpdateOptions,
    getEqFilters: () => [...eqFilters],
    // Helper to simulate presence sync
    simulatePresenceSync: () => {
      const handlers = channelHandlers['presence:sync'] ?? [];
      for (const handler of handlers) {
        handler();
      }
    },
    simulatePresenceJoin: (payload?: Record<string, unknown>) => {
      const handlers = channelHandlers['presence:join'] ?? [];
      for (const handler of handlers) {
        handler(payload ?? {});
      }
    },
    simulatePresenceLeave: (payload?: Record<string, unknown>) => {
      const handlers = channelHandlers['presence:leave'] ?? [];
      for (const handler of handlers) {
        handler(payload ?? {});
      }
    }
  };
}

function createDefaultConfig(supabase: unknown): OnlineSessionConfig {
  return {
    gameId: 'test-game-id',
    playerColor: 'red',
    currentUserId: CURRENT_USER_ID,
    opponentUserId: OPPONENT_USER_ID,
    timeControl: { timeMinutes: 5, incrementSeconds: 3 },
    supabase: supabase as OnlineSessionConfig['supabase'],
    redPlayerName: 'RedPlayer',
    bluePlayerName: 'BluePlayer'
  };
}

// Helper: trigger a local move through GameSession's board config callback,
// which fires onMove(san) → OnlineGameSessionCore.#handleLocalMove → sendGameMessage.
function triggerLocalMove(session: OnlineGameSessionCore) {
  const moves = session.session.possibleMoves;
  expect(moves.length).toBeGreaterThan(0);
  const move = moves[0];
  const boardConfig = session.session.boardConfig;
  boardConfig.movable.events.after({ square: move.from }, { square: move.to });
  return move;
}

describe('OnlineGameSessionCore', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  let core: OnlineGameSessionCore;

  beforeEach(() => {
    vi.useFakeTimers();
    mock = createMockSupabase();
  });

  afterEach(() => {
    core?.destroy();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('creates session and clock with correct config', () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));

      expect(core.session).toBeDefined();
      expect(core.clock).toBeDefined();
      expect(core.playerColor).toBe('red');
      expect(core.gameId).toBe('test-game-id');
      expect(core.connectionState).toBe('disconnected');
      expect(core.lifecycle).toBe('waiting');
    });

    it('configures clock from time control', () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));

      // 5 minutes = 300000ms
      expect(core.clock.getTime('r')).toBe(300_000);
      expect(core.clock.getTime('b')).toBe(300_000);
    });
  });

  describe('join', () => {
    it('creates channel and subscribes', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();

      expect(mock.supabase.channel).toHaveBeenCalledWith('game:test-game-id');
      expect(core.connectionState).toBe('connecting');

      // Wait for subscribe callback
      await vi.advanceTimersByTimeAsync(10);

      expect(core.connectionState).toBe('connected');
      expect(core.lifecycle).toBe('waiting');
    });

    it('tracks presence after subscribing', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();

      await vi.advanceTimersByTimeAsync(10);

      expect(mock.mockChannel.track).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'red',
          userId: CURRENT_USER_ID,
          presenceId: expect.any(String)
        })
      );
    });

    it('starts game when opponent presence is detected', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      expect(core.lifecycle).toBe('waiting');
      expect(core.clock.status).toBe('idle');

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      expect(core.opponentConnected).toBe(true);
      expect(core.lifecycle).toBe('playing');
      expect(core.clock.status).toBe('running');
      expect(core.clock.activeSide).toBe('r');
    });

    it('warns and returns if already joined', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Join again should not create new channel
      core.join();
      expect(mock.supabase.channel).toHaveBeenCalledTimes(1);
    });
  });

  describe('local move broadcast', () => {
    it('broadcasts move with SAN, clock, seq, sentAt', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      const now = Date.now();
      const move = triggerLocalMove(core);

      expect(mock.mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'game-message',
          payload: expect.objectContaining({
            event: 'move',
            san: move.san,
            seq: 1,
          })
        })
      );

      // Verify clock and sentAt are present and reasonable
      const sendCall = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const payload = sendCall.payload;
      expect(payload.clock).toBeGreaterThan(0);
      expect(payload.sentAt).toBeGreaterThanOrEqual(now);
    });

    it('sends move messages with incrementing seq', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      // First local move (red)
      triggerLocalMove(core);
      expect(core.seqCounter).toBe(1);

      // Simulate opponent reply so it's our turn again
      const opponentMoves = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: opponentMoves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      // Second local move (red again)
      triggerLocalMove(core);
      expect(core.seqCounter).toBe(2);

      // Verify both sends had correct seq values
      const sendCalls = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls;
      // Filter to move broadcasts (not ack sends)
      const moveSends = sendCalls.filter(
        (c: unknown[]) => (c[0] as Record<string, unknown>).payload &&
          ((c[0] as Record<string, Record<string, unknown>>).payload.event === 'move')
      );
      expect(moveSends).toHaveLength(2);
      expect((moveSends[0][0] as Record<string, Record<string, unknown>>).payload.seq).toBe(1);
      expect((moveSends[1][0] as Record<string, Record<string, unknown>>).payload.seq).toBe(2);
    });

    it('tracks pending acks for local moves and clears on ack', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      triggerLocalMove(core);
      expect(core.pendingAckCount).toBe(1);

      mock.simulateGameMessage({ event: 'ack', seq: 1 });
      expect(core.pendingAckCount).toBe(0);
    });

    it('does not broadcast local move while waiting for opponent', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      expect(core.lifecycle).toBe('waiting');
      triggerLocalMove(core);
      expect(mock.mockChannel.send).not.toHaveBeenCalled();
    });

    it('switches clock side after local move', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      expect(core.clock.status).toBe('running');
      expect(core.clock.activeSide).toBe('r');
      triggerLocalMove(core);
      expect(core.clock.status).toBe('running');
      // Red moved first, so clock should have switched to blue's turn
      expect(core.clock.activeSide).toBe('b');
    });

    it('does not broadcast when disconnected', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      // Don't join — stays disconnected

      // Manually set the onMove callback to test the guard
      // Since session.onMove was set in constructor, try triggering via boardConfig
      const moves = core.session.possibleMoves;
      if (moves.length > 0) {
        const boardConfig = core.session.boardConfig;
        boardConfig.movable.events.after({ square: moves[0].from }, { square: moves[0].to });
      }

      expect(mock.mockChannel.send).not.toHaveBeenCalled();
    });
  });

  describe('remote move receive', () => {
    it('applies valid remote move and updates state', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      const moves = core.session.possibleMoves;
      const moveSan = moves[0].san;

      // Simulate receiving a remote move
      mock.simulateGameMessage({
        event: 'move',
        san: moveSan,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      // Move should have been applied
      expect(core.session.history).toHaveLength(1);
      expect(core.lifecycle).toBe('playing');
    });

    it('sends ack on remote move', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      const moves = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      // Should have sent ack
      expect(mock.mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'game-message',
          payload: { event: 'ack', senderId: CURRENT_USER_ID, seq: 1 }
        })
      );
    });

    it('skips duplicate seq moves', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      const moves = core.session.possibleMoves;
      const msg = {
        event: 'move' as const,
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      };

      // First receive
      mock.simulateGameMessage(msg);
      expect(core.session.history).toHaveLength(1);

      // Duplicate should be skipped
      mock.simulateGameMessage(msg);
      expect(core.session.history).toHaveLength(1);
    });

    it('applies lag compensation to clock', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      const moves = core.session.possibleMoves;
      const sentAt = Date.now() - 100; // 100ms lag

      mock.simulateGameMessage({
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt
      });

      // Opponent's clock should have lag compensation applied
      // The lag is ~100ms, LagTracker debits from quota
      // Adjusted clock = 299000 + min(100, 500) = 299100
      const opponentTime = core.clock.getTime(core.opponentClockColor);
      // Clock was set to adjustedClock (299100) then switchSide added increment
      // After switchSide, the side that moved gets increment (3000ms)
      // Since opponent moved (blue for red player), blue gets increment
      // So blue time = 299100 + 3000 = 302100
      expect(opponentTime).toBeGreaterThan(299_000);
    });

    it('logs error for invalid remote move', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.simulateGameMessage({
        event: 'move',
        san: 'Zz9',
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      // Invalid move should not be added to history
      expect(core.session.history).toHaveLength(0);
    });

    it('ignores messages from unexpected senders', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      const moves = core.session.possibleMoves;
      mock.simulateGameMessage({
        senderId: 'intruder-user',
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      expect(core.session.history).toHaveLength(0);
    });
  });

  describe('ack retry', () => {
    it('resends move after 3s with no ack', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      triggerLocalMove(core);
      const sendCallsBefore = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.length;
      const firstMovePayload = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]
        ?.payload as Record<string, unknown>;

      // Advance 3s — should trigger retry
      await vi.advanceTimersByTimeAsync(3000);

      const sendCallsAfter = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(sendCallsAfter).toBeGreaterThan(sendCallsBefore);
      const resentPayload = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]
        ?.payload as Record<string, unknown>;
      expect(resentPayload.event).toBe('move');
      expect(resentPayload.seq).toBe(firstMovePayload.seq);
      expect(resentPayload).toEqual(firstMovePayload);
    });

    it('clears retry timer on ack receipt', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      triggerLocalMove(core);
      mock.simulateGameMessage({ event: 'ack', seq: 1 });
      expect(core.pendingAckCount).toBe(0);

      const sendCallsBefore = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.length;

      // Advance 3s — should NOT trigger retry since ack was received
      await vi.advanceTimersByTimeAsync(3000);

      const sendCallsAfter = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(sendCallsAfter).toBe(sendCallsBefore);
    });

    it('clears all retry timers on destroy', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      triggerLocalMove(core);
      expect(core.pendingAckCount).toBe(1);

      core.destroy();

      // Advance 3s — should NOT trigger retry since destroyed
      const sendCallsBefore = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.length;
      await vi.advanceTimersByTimeAsync(3000);
      const sendCallsAfter = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(sendCallsAfter).toBe(sendCallsBefore);
    });

    it('clears pending retries when channel disconnects', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      triggerLocalMove(core);
      expect(core.pendingAckCount).toBe(1);

      const subscribeCallback = mock.getSubscribeCallback();
      expect(subscribeCallback).toBeTruthy();
      subscribeCallback?.('CHANNEL_ERROR');

      expect(core.connectionState).toBe('disconnected');
      expect(core.pendingAckCount).toBe(0);
    });
  });

  describe('NoStart timeout', () => {
    it('aborts game after 30s with no moves', async () => {
      const onAbort = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onAbort });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Advance past 30s timeout
      await vi.advanceTimersByTimeAsync(30_000);

      expect(core.lifecycle).toBe('ended');
      expect(onAbort).toHaveBeenCalled();
    });

    it('clears timeout on first move', async () => {
      const onAbort = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onAbort });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Receive a move before timeout
      const moves = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      // Advance past original timeout
      await vi.advanceTimersByTimeAsync(30_000);

      // Should NOT have aborted
      expect(core.lifecycle).toBe('playing');
      expect(onAbort).not.toHaveBeenCalled();
    });

    it('handles remote abort by ending lifecycle and notifying callback once', async () => {
      const onAbort = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onAbort });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.simulateGameMessage({ event: 'abort' });
      mock.simulateGameMessage({ event: 'abort' });

      expect(core.lifecycle).toBe('ended');
      expect(onAbort).toHaveBeenCalledTimes(1);
    });
  });

  describe('Presence tracking', () => {
    it('detects opponent connected via presence join', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      expect(core.opponentConnected).toBe(false);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceJoin({ key: 'opponent-key' });
      expect(core.opponentConnected).toBe(true);
    });

    it('detects opponent disconnected via presence leave', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceJoin({ key: 'opponent-key' });
      expect(core.opponentConnected).toBe(true);

      delete mock.presenceState['opponent'];
      mock.simulatePresenceLeave({ key: 'opponent-key' });
      expect(core.opponentConnected).toBe(false);
    });

    it('syncs presence state correctly', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Add opponent to presence state
      mock.presenceState['opponent'] = [{ color: 'blue', userId: OPPONENT_USER_ID }];
      mock.simulatePresenceSync();

      expect(core.opponentConnected).toBe(true);
    });
  });

  describe('seq gap detection', () => {
    it('sets awaitingSync when gap detected', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Process seq=1 first
      const moves = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      expect(core.awaitingSync).toBe(false);

      // Skip seq=2, send seq=3 — gap detected
      const moves2 = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: moves2[0].san,
        clock: 298_000,
        seq: 3,
        sentAt: Date.now() - 50
      });

      expect(core.awaitingSync).toBe(true);
      const lastPayload = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]
        ?.payload as Record<string, unknown>;
      expect(lastPayload.event).toBe('sync-request');
      expect(lastPayload.expectedSeq).toBe(2);
    });

    it('ignores moves while awaiting sync', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Process seq=1
      const moves = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      // Trigger gap
      const moves2 = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: moves2[0].san,
        clock: 298_000,
        seq: 3,
        sentAt: Date.now() - 50
      });

      expect(core.awaitingSync).toBe(true);
      const historyLen = core.session.history.length;

      // Further moves should be ignored
      mock.simulateGameMessage({
        event: 'move',
        san: moves2[0].san,
        clock: 297_000,
        seq: 4,
        sentAt: Date.now() - 50
      });

      expect(core.session.history).toHaveLength(historyLen);
    });

    it('duplicate seq still sends ack (idempotent)', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      const moves = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      // Send duplicate — should still get ack
      const sendCallsBefore = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.length;
      mock.simulateGameMessage({
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      // An ack should have been sent for the duplicate
      const sendCallsAfter = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(sendCallsAfter).toBeGreaterThan(sendCallsBefore);

      // Verify it was an ack
      const lastCall = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      expect(lastCall[0].payload.event).toBe('ack');
      expect(lastCall[0].payload.seq).toBe(1);
    });
  });

  describe('sync message handling', () => {
    it('sends sync on opponent reconnect after disconnect during play', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Connect opponent
      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();
      expect(core.lifecycle).toBe('playing');
      expect(core.opponentConnected).toBe(true);

      // Disconnect opponent
      delete mock.presenceState['opponent'];
      mock.simulatePresenceLeave();
      expect(core.opponentConnected).toBe(false);

      // Clear sends from before
      (mock.mockChannel.send as ReturnType<typeof vi.fn>).mockClear();

      // Reconnect opponent
      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence-2'
      }];
      mock.simulatePresenceJoin();

      // Should have sent a sync message
      const sendCalls = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls;
      const syncSends = sendCalls.filter(
        (c: unknown[]) => {
          const payload = (c[0] as Record<string, Record<string, unknown>>).payload;
          return payload && payload.event === 'sync';
        }
      );
      expect(syncSends).toHaveLength(1);

      // Verify sync payload contains required fields
      const syncPayload = (syncSends[0][0] as Record<string, Record<string, unknown>>).payload;
      expect(syncPayload.fen).toBeDefined();
      expect(syncPayload.pgn).toBeDefined();
      expect(syncPayload.clock).toBeDefined();
      expect(syncPayload.seq).toBeDefined();
    });

    it('receives sync and loads game state', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Empty PGN sync — should load successfully
      mock.simulateGameMessage({
        event: 'sync',
        fen: core.session.game.fen(),
        pgn: '*',
        clock: { red: 250_000, blue: 280_000 },
        seq: 5
      });

      // Clock times should be updated
      expect(core.clock.getTime('r')).toBe(250_000);
      expect(core.clock.getTime('b')).toBe(280_000);
    });

    it('clears awaitingSync on sync receipt', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Trigger gap to set awaitingSync
      const moves = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });
      mock.simulateGameMessage({
        event: 'move',
        san: 'dummy',
        clock: 298_000,
        seq: 3,
        sentAt: Date.now() - 50
      });
      expect(core.awaitingSync).toBe(true);

      // Receive sync
      mock.simulateGameMessage({
        event: 'sync',
        fen: core.session.game.fen(),
        pgn: '*',
        clock: { red: 250_000, blue: 280_000 },
        seq: 5
      });

      expect(core.awaitingSync).toBe(false);
    });

    it('clears pending ack timers on sync receipt', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      // Make local move (creates pending ack)
      triggerLocalMove(core);
      expect(core.pendingAckCount).toBe(1);

      // Receive sync — should clear pending acks
      mock.simulateGameMessage({
        event: 'sync',
        fen: core.session.game.fen(),
        pgn: '*',
        clock: { red: 250_000, blue: 280_000 },
        seq: 5
      });

      expect(core.pendingAckCount).toBe(0);
    });

    it('fires onSyncError on invalid PGN sync', async () => {
      const onSyncError = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onSyncError });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.simulateGameMessage({
        event: 'sync',
        fen: 'bogus',
        pgn: '[SetUp "1"]\n[FEN "INVALID"]\n\n*',
        clock: { red: 250_000, blue: 280_000 },
        seq: 5
      });

      expect(onSyncError).toHaveBeenCalledTimes(1);
      expect(onSyncError).toHaveBeenCalledWith(
        expect.objectContaining({
          pgn: expect.any(String),
          fen: expect.any(String),
          gameId: 'test-game-id'
        })
      );
    });

    it('full reconnection flow: disconnect → reconnect → sync → state restored', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Connect opponent to start game
      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();
      expect(core.lifecycle).toBe('playing');

      // Make a local move
      triggerLocalMove(core);
      expect(core.session.history.length).toBeGreaterThan(0);

      // Opponent disconnects
      delete mock.presenceState['opponent'];
      mock.simulatePresenceLeave();
      expect(core.opponentConnected).toBe(false);

      // Opponent reconnects
      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence-2'
      }];

      (mock.mockChannel.send as ReturnType<typeof vi.fn>).mockClear();
      mock.simulatePresenceJoin();
      expect(core.opponentConnected).toBe(true);

      // Verify sync was sent
      const syncSends = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: unknown[]) => (c[0] as Record<string, Record<string, unknown>>).payload?.event === 'sync'
      );
      expect(syncSends).toHaveLength(1);
    });

    it('sends sync when opponent explicitly requests it', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();
      expect(core.lifecycle).toBe('playing');

      (mock.mockChannel.send as ReturnType<typeof vi.fn>).mockClear();
      mock.simulateGameMessage({ event: 'sync-request', expectedSeq: 2 });

      const syncSends = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: unknown[]) => (c[0] as Record<string, Record<string, unknown>>).payload?.event === 'sync'
      );
      expect(syncSends).toHaveLength(1);
    });
  });

  describe('destroy', () => {
    it('cleans up channel and timers', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      core.destroy();

      expect(mock.supabase.removeChannel).toHaveBeenCalled();
      expect(core.connectionState).toBe('disconnected');
    });

    it('cancels NoStart timer on destroy', async () => {
      const onAbort = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onAbort });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      core.destroy();

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(30_000);

      // Should NOT have called onAbort
      expect(onAbort).not.toHaveBeenCalled();
    });
  });

  describe('clock color mapping', () => {
    it('maps red player correctly', () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      expect(core.myClockColor).toBe('r');
      expect(core.opponentClockColor).toBe('b');
    });

    it('maps blue player correctly', () => {
      const config = createDefaultConfig(mock.supabase);
      config.playerColor = 'blue';
      core = new OnlineGameSessionCore(config);
      expect(core.myClockColor).toBe('b');
      expect(core.opponentClockColor).toBe('r');
    });
  });

  describe('clock annotation tracking', () => {
    it('accumulates clock annotations on local move', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      triggerLocalMove(core);
      expect(core.clockAnnotations).toHaveLength(1);
      expect(core.clockAnnotations[0]).toMatch(/^\d+:\d{2}:\d{2}$/);
    });

    it('accumulates clock annotations on remote move', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      const moves = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      expect(core.clockAnnotations).toHaveLength(1);
      expect(core.clockAnnotations[0]).toMatch(/^\d+:\d{2}:\d{2}$/);
    });

    it('resets clock annotations on sync', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Add a move to get an annotation
      const moves = core.session.possibleMoves;
      mock.simulateGameMessage({
        event: 'move',
        san: moves[0].san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });
      expect(core.clockAnnotations).toHaveLength(1);

      // Sync should clear annotations
      mock.simulateGameMessage({
        event: 'sync',
        fen: core.session.game.fen(),
        pgn: '*',
        clock: { red: 250_000, blue: 280_000 },
        seq: 5
      });
      expect(core.clockAnnotations).toHaveLength(0);
    });

    it('formats clock annotation correctly', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      // Make a move right away (clock is ~5:00:000 = 300000ms)
      triggerLocalMove(core);
      // 300000ms = 0:05:00
      expect(core.clockAnnotations[0]).toBe('0:05:00');
    });
  });

  describe('resign', () => {
    it('sends resign message and ends game with opponent as winner', async () => {
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      core.resign();

      expect(core.lifecycle).toBe('ended');
      expect(core.gameResult).toEqual(expect.objectContaining({
        status: 'resign',
        winner: 'blue',
        resultReason: 'resignation',
        isLocalPlayerWinner: false
      }));
      expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
        status: 'resign',
        winner: 'blue'
      }));

      // Should have sent resign message
      const sendCalls = (mock.mockChannel.send as ReturnType<typeof vi.fn>).mock.calls;
      const resignSends = sendCalls.filter(
        (c: unknown[]) => (c[0] as Record<string, Record<string, unknown>>).payload?.event === 'resign'
      );
      expect(resignSends).toHaveLength(1);
    });

    it('does nothing if lifecycle is not playing', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Still in 'waiting' state
      core.resign();
      expect(core.lifecycle).toBe('waiting');
    });

    it('handles receiving resign message — local player wins', async () => {
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      mock.simulateGameMessage({ event: 'resign' });

      expect(core.lifecycle).toBe('ended');
      expect(core.gameResult).toEqual(expect.objectContaining({
        status: 'resign',
        winner: 'red',
        resultReason: 'resignation',
        isLocalPlayerWinner: true
      }));
      expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
        status: 'resign',
        winner: 'red'
      }));
    });

    it('ignores resign message if already ended', async () => {
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      // First resign
      mock.simulateGameMessage({ event: 'resign' });
      expect(onGameEnd).toHaveBeenCalledTimes(1);

      // Second resign should be ignored
      mock.simulateGameMessage({ event: 'resign' });
      expect(onGameEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('game end detection', () => {
    it('detects checkmate after local move and fires onGameEnd', async () => {
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      const localMove = core.session.possibleMoves[0];
      expect(localMove).toBeDefined();
      const boardConfig = core.session.boardConfig;

      const statusSpy = vi.spyOn(core.session, 'status', 'get').mockReturnValue('checkmate');
      const winnerSpy = vi.spyOn(core.session, 'winner', 'get').mockReturnValue('r');
      const commanderSpy = vi.spyOn(core.session.game, 'isCommanderCaptured').mockReturnValue(false);
      const checkmateSpy = vi.spyOn(core.session.game, 'isCheckmate').mockReturnValue(true);
      const stalemateSpy = vi.spyOn(core.session.game, 'isStalemate').mockReturnValue(false);
      const fiftySpy = vi.spyOn(core.session.game, 'isDrawByFiftyMoves').mockReturnValue(false);
      const repetitionSpy = vi.spyOn(core.session.game, 'isThreefoldRepetition').mockReturnValue(false);

      boardConfig.movable.events.after({ square: localMove.from }, { square: localMove.to });

      expect(core.lifecycle).toBe('ended');
      expect(core.gameResult).toEqual(expect.objectContaining({
        status: 'checkmate',
        winner: 'red',
        resultReason: 'checkmate',
        isLocalPlayerWinner: true
      }));
      expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
        status: 'checkmate',
        winner: 'red'
      }));

      statusSpy.mockRestore();
      winnerSpy.mockRestore();
      commanderSpy.mockRestore();
      checkmateSpy.mockRestore();
      stalemateSpy.mockRestore();
      fiftySpy.mockRestore();
      repetitionSpy.mockRestore();
    });

    it('detects checkmate after remote move and fires onGameEnd', async () => {
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      const remoteMove = core.session.possibleMoves[0];
      expect(remoteMove).toBeDefined();

      const statusSpy = vi.spyOn(core.session, 'status', 'get').mockReturnValue('checkmate');
      const winnerSpy = vi.spyOn(core.session, 'winner', 'get').mockReturnValue('b');
      const commanderSpy = vi.spyOn(core.session.game, 'isCommanderCaptured').mockReturnValue(false);
      const checkmateSpy = vi.spyOn(core.session.game, 'isCheckmate').mockReturnValue(true);
      const stalemateSpy = vi.spyOn(core.session.game, 'isStalemate').mockReturnValue(false);
      const fiftySpy = vi.spyOn(core.session.game, 'isDrawByFiftyMoves').mockReturnValue(false);
      const repetitionSpy = vi.spyOn(core.session.game, 'isThreefoldRepetition').mockReturnValue(false);

      mock.simulateGameMessage({
        event: 'move',
        san: remoteMove.san,
        clock: 299_000,
        seq: 1,
        sentAt: Date.now() - 50
      });

      expect(core.lifecycle).toBe('ended');
      expect(core.gameResult).toEqual(expect.objectContaining({
        status: 'checkmate',
        winner: 'blue',
        resultReason: 'checkmate',
        isLocalPlayerWinner: false
      }));
      expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
        status: 'checkmate',
        winner: 'blue'
      }));

      statusSpy.mockRestore();
      winnerSpy.mockRestore();
      commanderSpy.mockRestore();
      checkmateSpy.mockRestore();
      stalemateSpy.mockRestore();
      fiftySpy.mockRestore();
      repetitionSpy.mockRestore();
    });

    it('maps stalemate to draw-without-winner result', async () => {
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      const localMove = core.session.possibleMoves[0];
      expect(localMove).toBeDefined();
      const boardConfig = core.session.boardConfig;

      const statusSpy = vi.spyOn(core.session, 'status', 'get').mockReturnValue('stalemate');
      const winnerSpy = vi.spyOn(core.session, 'winner', 'get').mockReturnValue(null);
      const commanderSpy = vi.spyOn(core.session.game, 'isCommanderCaptured').mockReturnValue(false);
      const checkmateSpy = vi.spyOn(core.session.game, 'isCheckmate').mockReturnValue(false);
      const stalemateSpy = vi.spyOn(core.session.game, 'isStalemate').mockReturnValue(true);
      const fiftySpy = vi.spyOn(core.session.game, 'isDrawByFiftyMoves').mockReturnValue(false);
      const repetitionSpy = vi.spyOn(core.session.game, 'isThreefoldRepetition').mockReturnValue(false);

      boardConfig.movable.events.after({ square: localMove.from }, { square: localMove.to });

      expect(core.lifecycle).toBe('ended');
      expect(core.gameResult).toEqual(expect.objectContaining({
        status: 'stalemate',
        winner: null,
        resultReason: 'stalemate'
      }));
      expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
        status: 'stalemate',
        winner: null
      }));

      statusSpy.mockRestore();
      winnerSpy.mockRestore();
      commanderSpy.mockRestore();
      checkmateSpy.mockRestore();
      stalemateSpy.mockRestore();
      fiftySpy.mockRestore();
      repetitionSpy.mockRestore();
    });

    it('uses commander_captured reason for commander-capture game end', async () => {
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      const localMove = core.session.possibleMoves[0];
      expect(localMove).toBeDefined();
      const boardConfig = core.session.boardConfig;

      const statusSpy = vi.spyOn(core.session, 'status', 'get').mockReturnValue('checkmate');
      const winnerSpy = vi.spyOn(core.session, 'winner', 'get').mockReturnValue('r');
      const commanderSpy = vi.spyOn(core.session.game, 'isCommanderCaptured').mockReturnValue(true);

      boardConfig.movable.events.after({ square: localMove.from }, { square: localMove.to });

      expect(core.lifecycle).toBe('ended');
      expect(core.gameResult).toEqual(expect.objectContaining({
        status: 'checkmate',
        winner: 'red',
        resultReason: 'commander_captured'
      }));
      expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
        status: 'checkmate',
        resultReason: 'commander_captured'
      }));

      statusSpy.mockRestore();
      winnerSpy.mockRestore();
      commanderSpy.mockRestore();
    });

    it('does not end game when status remains playing (deploy-session guard behavior)', async () => {
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      const statusSpy = vi.spyOn(core.session, 'status', 'get').mockReturnValue('playing');
      const commanderSpy = vi.spyOn(core.session.game, 'isCommanderCaptured').mockReturnValue(true);

      triggerLocalMove(core);

      expect(core.lifecycle).toBe('playing');
      expect(core.gameResult).toBeNull();
      expect(onGameEnd).not.toHaveBeenCalled();
      expect(mock.supabase.from).not.toHaveBeenCalledWith('games');

      statusSpy.mockRestore();
      commanderSpy.mockRestore();
    });

    it('checkGameEnd is idempotent — calling twice does not double-fire', async () => {
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      // Resign ends the game, which sets lifecycle to 'ended'
      core.resign();
      expect(onGameEnd).toHaveBeenCalledTimes(1);

      // A second resign should be guarded
      core.resign();
      expect(onGameEnd).toHaveBeenCalledTimes(1);
    });

    it('gameResult getter returns null while playing', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      expect(core.gameResult).toBeNull();
    });
  });

  describe('optimistic concurrency', () => {
    it('handles DB update returning count=0 gracefully', async () => {
      mock.setUpdateResult({ error: null, count: 0 });
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      // Should not throw
      core.resign();
      expect(core.lifecycle).toBe('ended');
      expect(onGameEnd).toHaveBeenCalledTimes(1);
      expect(mock.getLastUpdateOptions()).toEqual({ count: 'exact' });
    });

    it('handles DB error gracefully without crashing', async () => {
      mock.setUpdateResult({ error: new Error('network error'), count: 0 });
      const onGameEnd = vi.fn();
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase), { onGameEnd });
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      // Should not throw
      core.resign();
      expect(core.lifecycle).toBe('ended');
      expect(onGameEnd).toHaveBeenCalledTimes(1);
      expect(mock.getLastUpdateOptions()).toEqual({ count: 'exact' });
    });
  });

  describe('PGN save', () => {
    it('writes result with expected headers, clock annotations, and optimistic-concurrency filters', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.presenceState['opponent'] = [{
        color: 'blue',
        userId: OPPONENT_USER_ID,
        presenceId: 'opponent-presence'
      }];
      mock.simulatePresenceSync();

      // Add at least one move so PGN includes move text and a clock annotation.
      triggerLocalMove(core);
      core.resign();
      await Promise.resolve();

      // Verify supabase.from('games').update was called
      expect(mock.supabase.from).toHaveBeenCalledWith('games');
      expect(mock.getLastUpdateOptions()).toEqual({ count: 'exact' });
      expect(mock.getEqFilters()).toEqual([
        { column: 'id', value: 'test-game-id' },
        { column: 'status', value: 'started' }
      ]);

      const updateValues = mock.getLastUpdateValues() as Record<string, unknown>;
      expect(updateValues.status).toBe('resign');
      expect(updateValues.winner).toBe('blue');
      expect(updateValues.result_reason).toBe('resignation');

      const pgn = String(updateValues.pgn ?? '');
      expect(pgn).toContain('[Red "RedPlayer"]');
      expect(pgn).toContain('[Blue "BluePlayer"]');
      expect(pgn).toContain('[TimeControl "300+3"]');
      expect(pgn).toContain('[Termination "resignation"]');
      expect(pgn).toContain('[Result "0-1"]');
      expect(pgn).toContain('[Date "');
      expect(pgn).toContain('%clk ');
    });
  });
});
