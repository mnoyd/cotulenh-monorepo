import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  subscribeToInvitations,
  unsubscribeFromInvitations,
  onInvitationEvent,
  _setRealtimeStateCallback
} from './realtime-core';
import type { InvitationRealtimeEvent } from './realtime-core';

// Track registered postgres_changes handlers
type PostgresChangesHandler = (payload: {
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}) => void;
interface ChangeRegistration {
  event: string;
  filter: string;
  handler: PostgresChangesHandler;
}

function createMockSupabase() {
  const registrations: ChangeRegistration[] = [];
  let subscribeCallback: ((status: string) => void) | null = null;

  const mockChannel = {
    on: vi
      .fn()
      .mockImplementation(
        (
          _type: string,
          opts: { event: string; filter: string },
          handler: PostgresChangesHandler
        ) => {
          registrations.push({ event: opts.event, filter: opts.filter, handler });
          return mockChannel;
        }
      ),
    subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
      subscribeCallback = cb;
      cb('SUBSCRIBED');
      return mockChannel;
    }),
    unsubscribe: vi.fn()
  };

  const supabase = {
    channel: vi.fn().mockReturnValue(mockChannel)
  };

  return {
    supabase: supabase as never,
    mockChannel,
    registrations,
    getSubscribeCallback: () => subscribeCallback
  };
}

describe('realtime-core', () => {
  beforeEach(() => {
    // Clean up any existing subscription
    unsubscribeFromInvitations();
    _setRealtimeStateCallback(null);
  });

  describe('subscribeToInvitations', () => {
    it('creates a channel with user-specific name', () => {
      const { supabase } = createMockSupabase();
      subscribeToInvitations(supabase, 'user-1');

      expect(supabase.channel).toHaveBeenCalledWith('user:user-1:invitations');
    });

    it('registers INSERT, UPDATE, and DELETE handlers', () => {
      const { supabase, registrations } = createMockSupabase();
      subscribeToInvitations(supabase, 'user-1');

      expect(registrations).toHaveLength(3);
      expect(registrations[0].event).toBe('INSERT');
      expect(registrations[0].filter).toBe('to_user=eq.user-1');
      expect(registrations[1].event).toBe('UPDATE');
      expect(registrations[1].filter).toBe('from_user=eq.user-1');
      expect(registrations[2].event).toBe('DELETE');
      expect(registrations[2].filter).toBe('to_user=eq.user-1');
    });

    it('does not create duplicate subscription if already subscribed', () => {
      const { supabase } = createMockSupabase();
      subscribeToInvitations(supabase, 'user-1');
      subscribeToInvitations(supabase, 'user-1');

      expect(supabase.channel).toHaveBeenCalledTimes(1);
    });

    it('calls subscribe on the channel', () => {
      const { supabase, mockChannel } = createMockSupabase();
      subscribeToInvitations(supabase, 'user-1');

      expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('event handling', () => {
    it('fires "received" event on INSERT', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: InvitationRealtimeEvent[] = [];
      subscribeToInvitations(supabase, 'user-1');
      onInvitationEvent((e) => events.push(e));

      // Simulate INSERT
      registrations[0].handler({
        new: {
          id: 'inv-1',
          from_user: 'user-2',
          game_config: { timeMinutes: 5, incrementSeconds: 0 },
          invite_code: 'ABC123',
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('received');
      if (events[0].type === 'received') {
        expect(events[0].id).toBe('inv-1');
        expect(events[0].fromUser).toBe('user-2');
        expect(events[0].gameConfig).toEqual({ timeMinutes: 5, incrementSeconds: 0 });
        expect(events[0].inviteCode).toBe('ABC123');
      }
    });

    it('fires "statusChanged" event on UPDATE', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: InvitationRealtimeEvent[] = [];
      subscribeToInvitations(supabase, 'user-1');
      onInvitationEvent((e) => events.push(e));

      // Simulate UPDATE
      registrations[1].handler({
        new: {
          id: 'inv-2',
          status: 'accepted'
        }
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('statusChanged');
      if (events[0].type === 'statusChanged') {
        expect(events[0].id).toBe('inv-2');
        expect(events[0].newStatus).toBe('accepted');
      }
    });

    it('fires "deleted" event on DELETE', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: InvitationRealtimeEvent[] = [];
      subscribeToInvitations(supabase, 'user-1');
      onInvitationEvent((e) => events.push(e));

      // Simulate DELETE
      registrations[2].handler({
        old: { id: 'inv-3' }
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('deleted');
      if (events[0].type === 'deleted') {
        expect(events[0].id).toBe('inv-3');
      }
    });

    it('notifies multiple callbacks', () => {
      const { supabase, registrations } = createMockSupabase();
      const events1: InvitationRealtimeEvent[] = [];
      const events2: InvitationRealtimeEvent[] = [];
      subscribeToInvitations(supabase, 'user-1');
      onInvitationEvent((e) => events1.push(e));
      onInvitationEvent((e) => events2.push(e));

      registrations[0].handler({
        new: {
          id: 'inv-1',
          from_user: 'user-2',
          game_config: { timeMinutes: 5, incrementSeconds: 0 },
          invite_code: 'ABC',
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
    });
  });

  describe('callback management', () => {
    it('unsubscribe function removes callback', () => {
      const { supabase, registrations } = createMockSupabase();
      const events: InvitationRealtimeEvent[] = [];
      subscribeToInvitations(supabase, 'user-1');
      const unsub = onInvitationEvent((e) => events.push(e));

      // Unsubscribe
      unsub();

      registrations[0].handler({
        new: {
          id: 'inv-1',
          from_user: 'user-2',
          game_config: { timeMinutes: 5, incrementSeconds: 0 },
          invite_code: 'ABC',
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      expect(events).toHaveLength(0);
    });

    it('state change callback is called on events', () => {
      const { supabase, registrations } = createMockSupabase();
      const stateCb = vi.fn();
      subscribeToInvitations(supabase, 'user-1');
      _setRealtimeStateCallback(stateCb);

      registrations[0].handler({
        new: {
          id: 'inv-1',
          from_user: 'user-2',
          game_config: { timeMinutes: 5, incrementSeconds: 0 },
          invite_code: 'ABC',
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      expect(stateCb).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribeFromInvitations', () => {
    it('calls unsubscribe on the channel', () => {
      const { supabase, mockChannel } = createMockSupabase();
      subscribeToInvitations(supabase, 'user-1');
      unsubscribeFromInvitations();

      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('clears callbacks on unsubscribe', () => {
      const { supabase } = createMockSupabase();
      const events: InvitationRealtimeEvent[] = [];
      subscribeToInvitations(supabase, 'user-1');
      onInvitationEvent((e) => events.push(e));

      unsubscribeFromInvitations();

      // Re-subscribe to get fresh channel (simulates re-creation)
      const { supabase: supabase2, registrations: reg2 } = createMockSupabase();
      subscribeToInvitations(supabase2, 'user-1');

      // Old callback should have been cleared
      reg2[0].handler({
        new: {
          id: 'inv-1',
          from_user: 'user-2',
          game_config: { timeMinutes: 5, incrementSeconds: 0 },
          invite_code: 'ABC',
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      expect(events).toHaveLength(0);
    });

    it('allows re-subscribing after unsubscribe', () => {
      const { supabase } = createMockSupabase();
      subscribeToInvitations(supabase, 'user-1');
      unsubscribeFromInvitations();

      const { supabase: supabase2 } = createMockSupabase();
      subscribeToInvitations(supabase2, 'user-1');

      expect(supabase2.channel).toHaveBeenCalledTimes(1);
    });
  });
});
