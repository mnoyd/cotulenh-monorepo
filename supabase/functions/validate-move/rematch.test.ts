import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import { assertMatch } from 'https://deno.land/std@0.224.0/assert/assert_match.ts';

import {
  expirePendingAction,
  handleRematchAccept,
  handleRematchDecline,
  handleRematchOffer,
  isRematchTerminalStatus,
  type RematchGameState
} from './rematch.ts';

type MockOptions = {
  updateError?: boolean;
  rpcError?: boolean;
  rpcResult?: string;
};

function createMockSupabase(options?: MockOptions) {
  const calls: {
    updates: Array<{ table: string; data: Record<string, unknown>; id: string }>;
    broadcasts: Array<{ channel: string; event: Record<string, unknown> }>;
    rpcs: Array<{ fn: string; args: Record<string, unknown> }>;
  } = {
    updates: [],
    broadcasts: [],
    rpcs: []
  };

  const client = {
    from: (table: string) => ({
      update: (data: Record<string, unknown>) => ({
        eq: async (_column: string, value: string) => {
          calls.updates.push({ table, data, id: value });
          return { error: options?.updateError ? { message: 'DB error' } : null };
        }
      })
    }),
    channel: (name: string) => ({
      send: async (message: Record<string, unknown>) => {
        calls.broadcasts.push({ channel: name, event: message });
      }
    }),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.rpcs.push({ fn, args });
      if (options?.rpcError) {
        return { data: null, error: { message: 'RPC error' } };
      }
      return { data: options?.rpcResult ?? 'rematch-game-123', error: null };
    }
  };

  return { client, calls };
}

function createContext(overrides?: Partial<RematchGameState>, options?: MockOptions) {
  const mock = createMockSupabase(options);
  const gameState: RematchGameState = {
    id: 'game-state-1',
    move_history: ['e2e4', 'e7e5', 'g1f3'],
    pending_action: null,
    ...overrides
  };

  return {
    mock,
    context: {
      supabase: mock.client,
      gameId: 'game-123',
      gameState
    }
  };
}

function recentTimestamp() {
  return new Date().toISOString();
}

Deno.test('isRematchTerminalStatus rejects active games and allows ended games', () => {
  assertEquals(isRematchTerminalStatus('started'), false);
  assertEquals(isRematchTerminalStatus('aborted'), false);
  assertEquals(isRematchTerminalStatus('checkmate'), true);
  assertEquals(isRematchTerminalStatus('draw'), true);
});

Deno.test('handleRematchOffer stores a rematch offer and broadcasts it', async () => {
  const { context, mock } = createContext();

  const result = await handleRematchOffer(context, 'red');

  assertEquals(result.ok, true);
  if (!result.ok) return;

  assertEquals(result.data, { rematch_offer: true });
  assertEquals(mock.calls.updates.length, 1);
  assertEquals(mock.calls.updates[0].table, 'game_states');
  assertEquals(mock.calls.updates[0].id, 'game-state-1');

  const pendingAction = mock.calls.updates[0].data.pending_action as Record<string, unknown>;
  assertEquals(pendingAction.type, 'rematch_offer');
  assertEquals(pendingAction.color, 'red');
  assertMatch(pendingAction.created_at as string, /^\d{4}-\d{2}-\d{2}T/);

  assertEquals(mock.calls.broadcasts.length, 1);
  assertEquals(mock.calls.broadcasts[0].channel, 'game:game-123');
  assertEquals(mock.calls.broadcasts[0].event.event, 'rematch_offer');

  const payload = mock.calls.broadcasts[0].event.payload as Record<string, unknown>;
  assertEquals(payload.seq, 4);
  const inner = payload.payload as Record<string, unknown>;
  assertEquals(inner.offering_color, 'red');
});

Deno.test('handleRematchOffer rejects duplicate pending offers', async () => {
  const { context } = createContext({
    pending_action: {
      type: 'rematch_offer',
      color: 'blue',
      created_at: recentTimestamp()
    }
  });

  const result = await handleRematchOffer(context, 'red');

  assertEquals(result, {
    ok: false,
    error: 'A pending action already exists',
    code: 'DUPLICATE_ACTION',
    status: 400
  });
});

Deno.test(
  'handleRematchAccept creates a rematch game, clears pending action, and broadcasts acceptance',
  async () => {
    const { context, mock } = createContext({
      pending_action: {
        type: 'rematch_offer',
        color: 'blue',
        created_at: recentTimestamp()
      }
    });

    const result = await handleRematchAccept(context, 'red', 'default-fen');

    assertEquals(result.ok, true);
    if (!result.ok) return;

    assertEquals(result.data, { rematch_accepted: true, new_game_id: 'rematch-game-123' });
    assertEquals(mock.calls.rpcs, [
      {
        fn: 'create_rematch_game',
        args: { p_original_game_id: 'game-123', p_fen: 'default-fen' }
      }
    ]);
    assertEquals(mock.calls.updates.length, 1);
    assertEquals(mock.calls.updates[0].data, { pending_action: null });
    assertEquals(mock.calls.broadcasts.length, 1);
    assertEquals(mock.calls.broadcasts[0].event.event, 'rematch_accepted');

    const payload = mock.calls.broadcasts[0].event.payload as Record<string, unknown>;
    assertEquals(payload.seq, 5);
    const inner = payload.payload as Record<string, unknown>;
    assertEquals(inner.new_game_id, 'rematch-game-123');
  }
);

Deno.test('handleRematchAccept rejects accepting your own offer', async () => {
  const { context } = createContext({
    pending_action: {
      type: 'rematch_offer',
      color: 'red',
      created_at: recentTimestamp()
    }
  });

  const result = await handleRematchAccept(context, 'red', 'default-fen');

  assertEquals(result, {
    ok: false,
    error: 'No pending rematch offer from opponent',
    code: 'INVALID_ACTION',
    status: 400
  });
});

Deno.test('handleRematchAccept expires stale offers and returns expired action', async () => {
  const { context, mock } = createContext({
    pending_action: {
      type: 'rematch_offer',
      color: 'blue',
      created_at: '2026-03-20T00:00:00.000Z'
    }
  });

  const result = await handleRematchAccept(context, 'red', 'default-fen');

  assertEquals(result, {
    ok: false,
    error: 'Rematch offer has expired',
    code: 'EXPIRED_ACTION',
    status: 409
  });
  assertEquals(mock.calls.updates.length, 1);
  assertEquals(mock.calls.updates[0].data, { pending_action: null });
  assertEquals(mock.calls.broadcasts.length, 1);
  assertEquals(mock.calls.broadcasts[0].event.event, 'rematch_expired');

  const payload = mock.calls.broadcasts[0].event.payload as Record<string, unknown>;
  assertEquals(payload.seq, 4);
});

Deno.test('handleRematchDecline clears pending action and broadcasts decline', async () => {
  const { context, mock } = createContext({
    pending_action: {
      type: 'rematch_offer',
      color: 'blue',
      created_at: recentTimestamp()
    }
  });

  const result = await handleRematchDecline(context, 'red');

  assertEquals(result.ok, true);
  if (!result.ok) return;

  assertEquals(result.data, { rematch_declined: true });
  assertEquals(mock.calls.updates.length, 1);
  assertEquals(mock.calls.updates[0].data, { pending_action: null });
  assertEquals(mock.calls.broadcasts.length, 1);
  assertEquals(mock.calls.broadcasts[0].event.event, 'rematch_declined');

  const payload = mock.calls.broadcasts[0].event.payload as Record<string, unknown>;
  assertEquals(payload.seq, 4);
});

Deno.test('expirePendingAction emits rematch_expired with post-game sequence', async () => {
  const { context, mock } = createContext();

  const result = await expirePendingAction(context, {
    type: 'rematch_offer',
    color: 'red',
    created_at: '2026-03-23T00:00:00.000Z'
  });

  assertEquals(result, { success: true, event: 'rematch_expired' });
  assertEquals(mock.calls.updates.length, 1);
  assertEquals(mock.calls.broadcasts.length, 1);

  const payload = mock.calls.broadcasts[0].event.payload as Record<string, unknown>;
  assertEquals(payload.seq, 4);
});
