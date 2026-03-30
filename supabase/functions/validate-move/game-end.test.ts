import { completeGame, determineGameEndResult, type GameData } from './game-end.ts';
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import { assertMatch } from 'https://deno.land/std@0.224.0/assert/assert_match.ts';

function createMockSupabase(opts?: { updateError?: boolean }) {
  const calls: {
    update?: { table: string; data: Record<string, unknown>; id: string };
    broadcast?: { channel: string; event: Record<string, unknown> };
  } = {};

  return {
    client: {
      from: (table: string) => ({
        update: (data: Record<string, unknown>) => ({
          eq: async (_col: string, val: string) => {
            calls.update = { table, data, id: val };
            if (opts?.updateError) {
              return { error: { message: 'DB error' } };
            }
            return { error: null };
          }
        }),
        select: (_columns: string) => ({
          eq: (_col: string, _val: unknown) => ({
            single: async () => ({ data: null, error: { message: 'not found' } })
          })
        })
      }),
      rpc: async () => ({ error: null }),
      channel: (name: string) => ({
        send: async (msg: Record<string, unknown>) => {
          calls.broadcast = { channel: name, event: msg };
        }
      })
    },
    calls
  };
}

Deno.test('completeGame sets checkmate status with winner', async () => {
  const mock = createMockSupabase();

  const result = await completeGame(
    mock.client,
    'game-123',
    {
      status: 'checkmate',
      winner: 'red',
      result_reason: null
    },
    5
  );

  assertEquals(result.success, true);
  assertEquals(mock.calls.update?.table, 'games');
  assertEquals(mock.calls.update?.data.status, 'checkmate');
  assertEquals(mock.calls.update?.data.winner, 'red');
  assertEquals(mock.calls.update?.data.result_reason, null);
  assertMatch(mock.calls.update?.data.ended_at as string, /^\d{4}-\d{2}-\d{2}T/);
  assertEquals(mock.calls.update?.id, 'game-123');
});

Deno.test('completeGame sets stalemate with null winner', async () => {
  const mock = createMockSupabase();

  const result = await completeGame(
    mock.client,
    'game-456',
    {
      status: 'stalemate',
      winner: null,
      result_reason: null
    },
    10
  );

  assertEquals(result.success, true);
  assertEquals(mock.calls.update?.data.status, 'stalemate');
  assertEquals(mock.calls.update?.data.winner, null);
});

Deno.test('completeGame sets draw with result_reason', async () => {
  const mock = createMockSupabase();

  const result = await completeGame(
    mock.client,
    'game-789',
    {
      status: 'draw',
      winner: null,
      result_reason: 'fifty_move_rule'
    },
    100
  );

  assertEquals(result.success, true);
  assertEquals(mock.calls.update?.data.status, 'draw');
  assertEquals(mock.calls.update?.data.result_reason, 'fifty_move_rule');
});

Deno.test('completeGame sets timeout with opponent as winner', async () => {
  const mock = createMockSupabase();

  const result = await completeGame(
    mock.client,
    'game-timeout',
    {
      status: 'timeout',
      winner: 'blue',
      result_reason: null
    },
    7
  );

  assertEquals(result.success, true);
  assertEquals(mock.calls.update?.data.status, 'timeout');
  assertEquals(mock.calls.update?.data.winner, 'blue');
});

Deno.test('completeGame broadcasts game_end event with correct payload', async () => {
  const mock = createMockSupabase();

  await completeGame(
    mock.client,
    'game-broadcast',
    {
      status: 'checkmate',
      winner: 'red',
      result_reason: null
    },
    15
  );

  assertEquals(mock.calls.broadcast?.channel, 'game:game-broadcast');
  const event = mock.calls.broadcast?.event;
  assertEquals(event?.type, 'broadcast');
  assertEquals(event?.event, 'game_end');

  const payload = event?.payload as Record<string, unknown>;
  assertEquals(payload.type, 'game_end');
  assertEquals(payload.seq, 15);

  const inner = payload.payload as Record<string, unknown>;
  assertEquals(inner.status, 'checkmate');
  assertEquals(inner.winner, 'red');
  assertEquals(inner.result_reason, null);
});

Deno.test('completeGame returns error when DB update fails', async () => {
  const mock = createMockSupabase({ updateError: true });

  const result = await completeGame(
    mock.client,
    'game-fail',
    {
      status: 'checkmate',
      winner: 'red',
      result_reason: null
    },
    5
  );

  assertEquals(result.success, false);
  assertEquals(result.error, 'Failed to complete game');
  assertEquals(mock.calls.broadcast, undefined); // No broadcast on failure
});

Deno.test('completeGame sets resign status with opponent as winner', async () => {
  const mock = createMockSupabase();

  const result = await completeGame(
    mock.client,
    'game-resign',
    {
      status: 'resign',
      winner: 'blue',
      result_reason: null
    },
    6
  );

  assertEquals(result.success, true);
  assertEquals(mock.calls.update?.data.status, 'resign');
  assertEquals(mock.calls.update?.data.winner, 'blue');
  assertEquals(mock.calls.update?.data.result_reason, null);
});

function createProbe(overrides?: Partial<Record<string, boolean>>) {
  return {
    isGameOver: () => overrides?.isGameOver ?? false,
    isCheckmate: () => overrides?.isCheckmate ?? false,
    isCommanderCaptured: () => overrides?.isCommanderCaptured ?? false,
    isStalemate: () => overrides?.isStalemate ?? false,
    isDrawByFiftyMoves: () => overrides?.isDrawByFiftyMoves ?? false,
    isThreefoldRepetition: () => overrides?.isThreefoldRepetition ?? false
  };
}

Deno.test('determineGameEndResult returns null when game is not over', () => {
  const result = determineGameEndResult(createProbe(), 'red');
  assertEquals(result, null);
});

Deno.test('determineGameEndResult returns checkmate winner as moving player', () => {
  const result = determineGameEndResult(
    createProbe({ isGameOver: true, isCheckmate: true }),
    'blue'
  );
  assertEquals(result, {
    status: 'checkmate',
    winner: 'blue',
    result_reason: null
  });
});

Deno.test('determineGameEndResult returns stalemate draw', () => {
  const result = determineGameEndResult(
    createProbe({ isGameOver: true, isStalemate: true }),
    'red'
  );
  assertEquals(result, {
    status: 'stalemate',
    winner: null,
    result_reason: null
  });
});

Deno.test('determineGameEndResult returns draw by fifty-move rule', () => {
  const result = determineGameEndResult(
    createProbe({ isGameOver: true, isDrawByFiftyMoves: true }),
    'red'
  );
  assertEquals(result, {
    status: 'draw',
    winner: null,
    result_reason: 'fifty_move_rule'
  });
});

Deno.test('determineGameEndResult returns draw by threefold repetition', () => {
  const result = determineGameEndResult(
    createProbe({ isGameOver: true, isThreefoldRepetition: true }),
    'red'
  );
  assertEquals(result, {
    status: 'draw',
    winner: null,
    result_reason: 'threefold_repetition'
  });
});

// === Rating integration tests ===

function createRatedMockSupabase(opts?: {
  rpcError?: boolean;
  ratingData?: Record<string, unknown> | null;
  ratingError?: boolean;
}) {
  const calls: {
    rpc?: { fn: string; params: Record<string, unknown> };
    broadcast?: { channel: string; event: Record<string, unknown> };
  } = {};

  return {
    client: {
      from: (table: string) => ({
        update: (data: Record<string, unknown>) => ({
          eq: async (_col: string, _val: string) => ({ error: null })
        }),
        select: (_columns: string) => ({
          eq: (_col: string, _val: unknown) => ({
            single: async () => ({
              data: opts?.ratingData ?? null,
              error: opts?.ratingError
                ? { message: 'DB error', code: 'XX000' }
                : opts?.ratingData
                  ? null
                  : { message: 'not found' }
            })
          })
        })
      }),
      rpc: async (fn: string, params: Record<string, unknown>) => {
        calls.rpc = { fn, params };
        if (opts?.rpcError) {
          return { error: { message: 'DB error' } };
        }
        return { error: null };
      },
      channel: (name: string) => ({
        send: async (msg: Record<string, unknown>) => {
          calls.broadcast = { channel: name, event: msg };
        }
      })
    },
    calls
  };
}

const ratedGameData: GameData = {
  redPlayerId: 'red-uuid',
  bluePlayerId: 'blue-uuid',
  isRated: true
};

const casualGameData: GameData = {
  redPlayerId: 'red-uuid',
  bluePlayerId: 'blue-uuid',
  isRated: false
};

Deno.test('completeGame calls RPC with rating params for rated game', async () => {
  const mock = createRatedMockSupabase();

  const result = await completeGame(
    mock.client as never,
    'game-rated',
    { status: 'checkmate', winner: 'red', result_reason: null },
    10,
    ratedGameData
  );

  assertEquals(result.success, true);
  assertEquals(mock.calls.rpc?.fn, 'complete_game_with_ratings');
  assertEquals(mock.calls.rpc?.params.p_game_id, 'game-rated');
  assertEquals(mock.calls.rpc?.params.p_status, 'checkmate');
  assertEquals(mock.calls.rpc?.params.p_winner, 'red');
  assertEquals(mock.calls.rpc?.params.p_is_rated, true);
  assertEquals(mock.calls.rpc?.params.p_red_player_id, 'red-uuid');
  assertEquals(mock.calls.rpc?.params.p_blue_player_id, 'blue-uuid');
  // Rating params should be present
  assertEquals(typeof mock.calls.rpc?.params.p_red_new_rating, 'number');
  assertEquals(typeof mock.calls.rpc?.params.p_blue_new_rating, 'number');
});

Deno.test('completeGame returns rating changes for rated game', async () => {
  const mock = createRatedMockSupabase();

  const result = await completeGame(
    mock.client as never,
    'game-rated',
    { status: 'checkmate', winner: 'red', result_reason: null },
    10,
    ratedGameData
  );

  assertEquals(result.success, true);
  // Should have rating changes
  assertEquals(result.ratingChanges != null, true);
  assertEquals(typeof result.ratingChanges!.red.old, 'number');
  assertEquals(typeof result.ratingChanges!.red.new, 'number');
  assertEquals(typeof result.ratingChanges!.red.delta, 'number');
  assertEquals(typeof result.ratingChanges!.blue.old, 'number');
  assertEquals(typeof result.ratingChanges!.blue.new, 'number');
});

Deno.test('completeGame broadcasts rating_changes in payload for rated game', async () => {
  const mock = createRatedMockSupabase();

  await completeGame(
    mock.client as never,
    'game-rated',
    { status: 'checkmate', winner: 'red', result_reason: null },
    10,
    ratedGameData
  );

  const payload = mock.calls.broadcast?.event.payload as Record<string, unknown>;
  const inner = payload.payload as Record<string, unknown>;
  assertEquals(inner.rating_changes != null, true);
});

Deno.test('completeGame skips rating update for casual game', async () => {
  const mock = createRatedMockSupabase();

  const result = await completeGame(
    mock.client as never,
    'game-casual',
    { status: 'checkmate', winner: 'red', result_reason: null },
    10,
    casualGameData
  );

  assertEquals(result.success, true);
  assertEquals(result.ratingChanges, null);
  // RPC should still be called but with is_rated=false
  assertEquals(mock.calls.rpc?.params.p_is_rated, false);
});

Deno.test('completeGame returns error when RPC fails for rated game', async () => {
  const mock = createRatedMockSupabase({ rpcError: true });

  const result = await completeGame(
    mock.client as never,
    'game-fail',
    { status: 'checkmate', winner: 'red', result_reason: null },
    10,
    ratedGameData
  );

  assertEquals(result.success, false);
  assertEquals(result.error, 'Failed to complete rated game');
  // No broadcast on failure
  assertEquals(mock.calls.broadcast, undefined);
});

Deno.test('completeGame returns error when rating lookup fails for rated game', async () => {
  const mock = createRatedMockSupabase({ ratingError: true });

  const result = await completeGame(
    mock.client as never,
    'game-fail',
    { status: 'checkmate', winner: 'red', result_reason: null },
    10,
    ratedGameData
  );

  assertEquals(result.success, false);
  assertEquals(result.error, 'Failed to load ratings');
  assertEquals(mock.calls.rpc, undefined);
  assertEquals(mock.calls.broadcast, undefined);
});
