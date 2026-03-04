import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from './+page.server';

function createMockLocals(user: { id: string } | null = { id: 'user-1' }) {
  const mockFrom = vi.fn();
  return {
    supabase: { from: mockFrom } as never,
    safeGetSession: vi.fn().mockResolvedValue({ user, session: user ? {} : null }),
    mockFrom
  };
}

function createChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  return chain;
}

const completedGame = {
  id: 'game-1',
  pgn: '1. e2-e4 e7-e5',
  status: 'completed',
  winner: 'red',
  result_reason: 'checkmate',
  time_control: { timeMinutes: 10, incrementSeconds: 5 },
  started_at: '2024-01-01T00:00:00Z',
  ended_at: '2024-01-01T01:00:00Z',
  red_player: 'user-1',
  blue_player: 'user-2',
  red_profile: { display_name: 'Red Player' },
  blue_profile: { display_name: 'Blue Player' }
};

describe('game replay page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns complete game data with PGN for a completed game', async () => {
    const locals = createMockLocals({ id: 'user-1' });
    const chain = createChain({ data: completedGame, error: null });
    locals.mockFrom.mockReturnValue(chain);

    const result = (await load({
      params: { gameId: 'game-1' },
      locals
    } as never)) as Record<string, unknown>;

    const game = result.game as Record<string, unknown>;
    expect(game.id).toBe('game-1');
    expect(game.pgn).toBe('1. e2-e4 e7-e5');
    expect(game.status).toBe('completed');
    expect(game.winner).toBe('red');
    expect(game.resultReason).toBe('checkmate');
    expect(game.timeControl).toEqual({ timeMinutes: 10, incrementSeconds: 5 });
    expect(game.startedAt).toBe('2024-01-01T00:00:00Z');
    expect(game.endedAt).toBe('2024-01-01T01:00:00Z');
  });

  it('returns player display names via FK join', async () => {
    const locals = createMockLocals({ id: 'user-1' });
    const chain = createChain({ data: completedGame, error: null });
    locals.mockFrom.mockReturnValue(chain);

    const result = (await load({
      params: { gameId: 'game-1' },
      locals
    } as never)) as Record<string, unknown>;

    const game = result.game as Record<string, unknown>;
    expect(game.redPlayer).toEqual({
      id: 'user-1',
      displayName: 'Red Player'
    });
    expect(game.bluePlayer).toEqual({
      id: 'user-2',
      displayName: 'Blue Player'
    });
  });

  it('returns 404 error for non-existent game ID', async () => {
    const locals = createMockLocals();
    const chain = createChain({ data: null, error: { code: 'PGRST116' } });
    locals.mockFrom.mockReturnValue(chain);

    await expect(
      load({
        params: { gameId: 'nonexistent' },
        locals
      } as never)
    ).rejects.toEqual(expect.objectContaining({ status: 404 }));
  });

  it('returns 404 error for in-progress game (status === started)', async () => {
    const locals = createMockLocals();
    const chain = createChain({
      data: { ...completedGame, status: 'started' },
      error: null
    });
    locals.mockFrom.mockReturnValue(chain);

    await expect(
      load({
        params: { gameId: 'game-1' },
        locals
      } as never)
    ).rejects.toEqual(expect.objectContaining({ status: 404 }));
  });

  it('handles Supabase query error gracefully', async () => {
    const locals = createMockLocals();
    const chain = createChain({ data: null, error: { message: 'Database error' } });
    locals.mockFrom.mockReturnValue(chain);

    await expect(
      load({
        params: { gameId: 'game-1' },
        locals
      } as never)
    ).rejects.toEqual(expect.objectContaining({ status: 404 }));
  });

  it('returns null currentUserId when no session', async () => {
    const locals = createMockLocals(null);
    const chain = createChain({ data: completedGame, error: null });
    locals.mockFrom.mockReturnValue(chain);

    const result = (await load({
      params: { gameId: 'game-1' },
      locals
    } as never)) as Record<string, unknown>;

    expect(result.currentUserId).toBeNull();
  });
});
