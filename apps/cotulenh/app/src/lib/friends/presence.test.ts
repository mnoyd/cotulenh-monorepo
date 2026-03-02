import { describe, it, expect, vi, beforeEach } from 'vitest';
import { joinLobby, leaveLobby, getOnlineUsers, isUserOnline, onPresenceChange, getLobbyConnected } from './presence-core';

// Mock @cotulenh/common logger
vi.mock('@cotulenh/common', () => ({
  logger: { info: vi.fn(), error: vi.fn() }
}));

function createMockChannel() {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  let subscribeCallback: ((status: string) => void) | null = null;
  let presenceState: Record<string, unknown[]> = {};

  const channel = {
    on: vi.fn().mockImplementation((_type: string, opts: { event: string }, handler: (...args: unknown[]) => void) => {
      const event = opts.event;
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return channel;
    }),
    subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
      subscribeCallback = cb;
      return channel;
    }),
    track: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn(),
    presenceState: vi.fn().mockImplementation(() => presenceState),
    // Test helpers
    _simulateSubscribed: () => subscribeCallback?.('SUBSCRIBED'),
    _simulateError: () => subscribeCallback?.('CHANNEL_ERROR'),
    _simulateSync: (state: Record<string, unknown[]>) => {
      presenceState = state;
      handlers['sync']?.forEach((h) => h());
    },
    _simulateJoin: (key: string) => {
      handlers['join']?.forEach((h) => h({ key }));
    },
    _simulateLeave: (key: string) => {
      handlers['leave']?.forEach((h) => h({ key }));
    }
  };

  return channel;
}

function createMockSupabase(channel: ReturnType<typeof createMockChannel>) {
  return {
    channel: vi.fn().mockReturnValue(channel)
  };
}

describe('presence-core', () => {
  beforeEach(() => {
    // Clean up between tests
    leaveLobby();
    vi.clearAllMocks();
  });

  describe('joinLobby', () => {
    it('creates a channel subscription for the lobby', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');

      expect(supabase.channel).toHaveBeenCalledWith('lobby', {
        config: { presence: { key: 'user-1' } }
      });
      expect(channel.on).toHaveBeenCalledTimes(3); // sync, join, leave
      expect(channel.subscribe).toHaveBeenCalled();
    });

    it('tracks user presence after subscription', async () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');
      await channel._simulateSubscribed();

      expect(channel.track).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1' })
      );
    });

    it('does not create duplicate subscriptions', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');

      expect(supabase.channel).toHaveBeenCalledTimes(1);
    });
  });

  describe('leaveLobby', () => {
    it('unsubscribes the channel', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');
      leaveLobby();

      expect(channel.unsubscribe).toHaveBeenCalled();
    });

    it('clears online users', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');

      // Simulate some users online
      channel._simulateSync({ 'user-2': [{}], 'user-3': [{}] });
      expect(getOnlineUsers().size).toBe(2);

      leaveLobby();
      expect(getOnlineUsers().size).toBe(0);
    });

    it('is safe to call without joining first', () => {
      expect(() => leaveLobby()).not.toThrow();
    });
  });

  describe('getOnlineUsers', () => {
    it('returns empty set initially', () => {
      expect(getOnlineUsers().size).toBe(0);
    });

    it('returns correct set after sync event', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');

      channel._simulateSync({
        'user-2': [{}],
        'user-3': [{}],
        'user-4': [{}]
      });

      const online = getOnlineUsers();
      expect(online.size).toBe(3);
      expect(online.has('user-2')).toBe(true);
      expect(online.has('user-3')).toBe(true);
      expect(online.has('user-4')).toBe(true);
    });

    it('updates on join event', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');

      channel._simulateJoin('user-5');
      expect(getOnlineUsers().has('user-5')).toBe(true);
    });

    it('updates on leave event', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');

      channel._simulateSync({ 'user-2': [{}] });
      expect(getOnlineUsers().has('user-2')).toBe(true);

      channel._simulateLeave('user-2');
      expect(getOnlineUsers().has('user-2')).toBe(false);
    });

    it('returns a defensive copy', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');
      channel._simulateSync({ 'user-2': [{}] });

      const snapshot = getOnlineUsers();
      snapshot.add('user-999');

      expect(getOnlineUsers().has('user-999')).toBe(false);
    });
  });

  describe('isUserOnline', () => {
    it('returns false for unknown user', () => {
      expect(isUserOnline('unknown')).toBe(false);
    });

    it('returns true for online user', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');
      channel._simulateJoin('user-2');

      expect(isUserOnline('user-2')).toBe(true);
    });
  });

  describe('onPresenceChange', () => {
    it('calls callback on sync event', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');

      const callback = vi.fn();
      onPresenceChange(callback);

      channel._simulateSync({ 'user-2': [{}] });
      expect(callback).toHaveBeenCalledWith(new Set(['user-2']));
    });

    it('calls callback on join event', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');

      const callback = vi.fn();
      onPresenceChange(callback);

      channel._simulateJoin('user-3');
      expect(callback).toHaveBeenCalled();
      const calledWith = callback.mock.calls[0][0] as Set<string>;
      expect(calledWith.has('user-3')).toBe(true);
    });

    it('returns unsubscribe function', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');

      const callback = vi.fn();
      const unsub = onPresenceChange(callback);

      unsub();

      channel._simulateJoin('user-4');
      expect(callback).not.toHaveBeenCalled();
    });

    it('clears callbacks on leave to avoid stale listeners', () => {
      const channel = createMockChannel();
      const supabase = createMockSupabase(channel);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');

      const callback = vi.fn();
      onPresenceChange(callback);

      leaveLobby();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      joinLobby(supabase as any, 'user-1');
      channel._simulateJoin('user-4');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getLobbyConnected', () => {
    it('returns false when not connected', () => {
      expect(getLobbyConnected()).toBe(false);
    });

    it('schedules reconnect when track fails', async () => {
      vi.useFakeTimers();
      try {
        const firstChannel = createMockChannel();
        firstChannel.track = vi.fn().mockRejectedValue(new Error('track failed'));
        const secondChannel = createMockChannel();
        const supabase = {
          channel: vi
            .fn()
            .mockReturnValueOnce(firstChannel)
            .mockReturnValueOnce(secondChannel)
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        joinLobby(supabase as any, 'user-1');
        await firstChannel._simulateSubscribed();

        expect(getLobbyConnected()).toBe(false);
        expect(supabase.channel).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1000);
        expect(supabase.channel).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
