import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  subscribeToLobby,
  unsubscribeFromLobby,
  onLobbyChallengeEvent,
  _setLobbyStateCallback
} from './lobby-realtime-core';
import type { LobbyChallengeEvent } from './lobby-realtime-core';

type PostgresChangesHandler = (payload: {
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}) => void;
interface ChangeRegistration {
  event: string;
  filter?: string;
  handler: PostgresChangesHandler;
}

function createMockSupabase() {
  const registrations: ChangeRegistration[] = [];

  const mockChannel = {
    on: vi
      .fn()
      .mockImplementation(
        (
          _type: string,
          opts: { event: string; filter?: string },
          handler: PostgresChangesHandler
        ) => {
          registrations.push({ event: opts.event, filter: opts.filter, handler });
          return mockChannel;
        }
      ),
    subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
      cb('SUBSCRIBED');
      return mockChannel;
    }),
    unsubscribe: vi.fn()
  };

  const supabase = {
    channel: vi.fn().mockReturnValue(mockChannel)
  };

  return { supabase, mockChannel, registrations };
}

function subscribeForTest(supabase: ReturnType<typeof createMockSupabase>['supabase']) {
  subscribeToLobby(supabase as unknown as Parameters<typeof subscribeToLobby>[0]);
}

describe('lobby-realtime-core', () => {
  beforeEach(() => {
    unsubscribeFromLobby();
    _setLobbyStateCallback(null);
  });

  describe('subscribeToLobby', () => {
    it('creates a channel named lobby:challenges', () => {
      const { supabase } = createMockSupabase();
      subscribeForTest(supabase);
      expect(supabase.channel).toHaveBeenCalledWith('lobby:challenges');
    });

    it('registers INSERT, UPDATE, and DELETE handlers', () => {
      const { supabase, registrations } = createMockSupabase();
      subscribeForTest(supabase);

      expect(registrations).toHaveLength(3);
      expect(registrations[0].event).toBe('INSERT');
      expect(registrations[0].filter).toBe('to_user=is.null');
      expect(registrations[1].event).toBe('UPDATE');
      expect(registrations[1].filter).toBeUndefined();
      expect(registrations[2].event).toBe('DELETE');
    });

    it('does not create duplicate subscription', () => {
      const { supabase } = createMockSupabase();
      subscribeForTest(supabase);
      subscribeForTest(supabase);
      expect(supabase.channel).toHaveBeenCalledTimes(1);
    });
  });

  describe('event handling', () => {
    it('fires insert event for open challenges (invite_code null)', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: LobbyChallengeEvent[] = [];
      subscribeForTest(supabase);
      onLobbyChallengeEvent((e) => events.push(e));

      registrations[0].handler({
        new: {
          id: 'inv-1',
          from_user: 'user-1',
          game_config: { timeMinutes: 5, incrementSeconds: 0 },
          invite_code: null,
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('insert');
      if (events[0].type === 'insert') {
        expect(events[0].id).toBe('inv-1');
        expect(events[0].fromUser).toBe('user-1');
      }
    });

    it('ignores INSERT for shareable links (invite_code not null)', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: LobbyChallengeEvent[] = [];
      subscribeForTest(supabase);
      onLobbyChallengeEvent((e) => events.push(e));

      registrations[0].handler({
        new: {
          id: 'inv-2',
          from_user: 'user-1',
          game_config: { timeMinutes: 5, incrementSeconds: 0 },
          invite_code: 'abc12345',
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      expect(events).toHaveLength(0);
    });

    it('fires update event when an open challenge is accepted', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: LobbyChallengeEvent[] = [];
      subscribeForTest(supabase);
      onLobbyChallengeEvent((e) => events.push(e));

      registrations[1].handler({
        old: { id: 'inv-1', status: 'pending', to_user: null, invite_code: null },
        new: { id: 'inv-1', status: 'accepted', to_user: 'user-2', invite_code: null }
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('update');
      if (events[0].type === 'update') {
        expect(events[0].newStatus).toBe('accepted');
      }
    });

    it('ignores UPDATE for non-open challenges', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: LobbyChallengeEvent[] = [];
      subscribeForTest(supabase);
      onLobbyChallengeEvent((e) => events.push(e));

      registrations[1].handler({
        old: { id: 'inv-1', status: 'pending', to_user: null, invite_code: 'link123' },
        new: { id: 'inv-1', status: 'accepted', to_user: 'user-2', invite_code: 'link123' }
      });

      expect(events).toHaveLength(0);
    });

    it('fires delete event for open challenges', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: LobbyChallengeEvent[] = [];
      subscribeForTest(supabase);
      onLobbyChallengeEvent((e) => events.push(e));

      registrations[2].handler({
        old: { id: 'inv-1', to_user: null, invite_code: null }
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('delete');
      if (events[0].type === 'delete') {
        expect(events[0].id).toBe('inv-1');
      }
    });

    it('ignores delete event for non-open challenges', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: LobbyChallengeEvent[] = [];
      subscribeForTest(supabase);
      onLobbyChallengeEvent((e) => events.push(e));

      registrations[2].handler({
        old: { id: 'inv-1', to_user: 'user-2', invite_code: 'link123' }
      });

      expect(events).toHaveLength(0);
    });

    it('notifies state change callback', () => {
      const { supabase, registrations } = createMockSupabase();
      const stateCb = vi.fn();
      subscribeForTest(supabase);
      _setLobbyStateCallback(stateCb);

      registrations[0].handler({
        new: {
          id: 'inv-1',
          from_user: 'user-1',
          game_config: { timeMinutes: 5, incrementSeconds: 0 },
          invite_code: null,
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      expect(stateCb).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('unsubscribes from channel', () => {
      const { supabase, mockChannel } = createMockSupabase();
      subscribeForTest(supabase);
      unsubscribeFromLobby();
      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('clears callbacks on unsubscribe', () => {
      const { supabase } = createMockSupabase();
      const events: LobbyChallengeEvent[] = [];
      subscribeForTest(supabase);
      onLobbyChallengeEvent((e) => events.push(e));

      unsubscribeFromLobby();

      const { supabase: s2, registrations: r2 } = createMockSupabase();
      subscribeForTest(s2);

      r2[0].handler({
        new: {
          id: 'inv-1',
          from_user: 'user-1',
          game_config: { timeMinutes: 5, incrementSeconds: 0 },
          invite_code: null,
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      expect(events).toHaveLength(0);
    });

    it('callback unsubscribe function works', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: LobbyChallengeEvent[] = [];
      subscribeForTest(supabase);
      const unsub = onLobbyChallengeEvent((e) => events.push(e));

      unsub();

      registrations[0].handler({
        new: {
          id: 'inv-1',
          from_user: 'user-1',
          game_config: { timeMinutes: 5, incrementSeconds: 0 },
          invite_code: null,
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      expect(events).toHaveLength(0);
    });
  });
});
