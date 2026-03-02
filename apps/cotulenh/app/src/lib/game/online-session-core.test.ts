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

  const supabase = {
    channel: vi.fn(() => mockChannel as unknown as RealtimeChannel),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null }))
      }))
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
      const handlers = channelHandlers['broadcast:game-message'] ?? [];
      for (const handler of handlers) {
        handler({ payload });
      }
    },
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
    timeControl: { timeMinutes: 5, incrementSeconds: 3 },
    supabase: supabase as OnlineSessionConfig['supabase']
  };
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

      expect(mock.mockChannel.track).toHaveBeenCalledWith({ color: 'red' });
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
    // Helper: trigger a local move through GameSession's board config callback,
    // which fires onMove(san) → OnlineGameSessionCore.#handleLocalMove → sendGameMessage.
    function triggerLocalMove(session: OnlineGameSessionCore) {
      const moves = session.session.possibleMoves;
      expect(moves.length).toBeGreaterThan(0);
      const move = moves[0];
      // Call the board config's after callback with valid coordinates
      const boardConfig = session.session.boardConfig;
      boardConfig.movable.events.after({ square: move.from }, { square: move.to });
      return move;
    }

    it('broadcasts move with SAN, clock, seq, sentAt', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

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

    it('transitions lifecycle to playing on first local move', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      expect(core.lifecycle).toBe('waiting');
      triggerLocalMove(core);
      expect(core.lifecycle).toBe('playing');
    });

    it('starts clock and switches side after local move', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      expect(core.clock.status).toBe('idle');
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
          payload: { event: 'ack', seq: 1 }
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
  });

  describe('Presence tracking', () => {
    it('detects opponent connected via presence join', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      expect(core.opponentConnected).toBe(false);

      mock.simulatePresenceJoin({ key: 'opponent-key' });
      expect(core.opponentConnected).toBe(true);
    });

    it('detects opponent disconnected via presence leave', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      mock.simulatePresenceJoin({ key: 'opponent-key' });
      expect(core.opponentConnected).toBe(true);

      mock.simulatePresenceLeave({ key: 'opponent-key' });
      expect(core.opponentConnected).toBe(false);
    });

    it('syncs presence state correctly', async () => {
      core = new OnlineGameSessionCore(createDefaultConfig(mock.supabase));
      core.join();
      await vi.advanceTimersByTimeAsync(10);

      // Add opponent to presence state
      mock.presenceState['opponent'] = [{ color: 'blue' }];
      mock.simulatePresenceSync();

      expect(core.opponentConnected).toBe(true);
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
});
