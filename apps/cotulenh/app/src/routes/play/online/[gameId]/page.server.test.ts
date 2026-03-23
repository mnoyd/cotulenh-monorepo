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

describe('game page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to login', async () => {
    const locals = createMockLocals(null);

    await expect(
      load({
        params: { gameId: 'game-1' },
        locals
      } as never)
    ).rejects.toEqual(expect.objectContaining({ status: 303, location: '/auth/login' }));
  });

  it('returns 404 when game not found', async () => {
    const locals = createMockLocals();
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    locals.mockFrom.mockReturnValue(chain);

    await expect(
      load({
        params: { gameId: 'nonexistent' },
        locals
      } as never)
    ).rejects.toEqual(expect.objectContaining({ status: 404 }));
  });

  it('returns 403 when user is not a player', async () => {
    const locals = createMockLocals({ id: 'user-3' });
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({
      data: {
        id: 'game-1',
        red_player: 'user-1',
        blue_player: 'user-2',
        status: 'started',
        time_control: { timeMinutes: 5, incrementSeconds: 0 },
        started_at: '2024-01-01T00:00:00Z',
        winner: null,
        result_reason: null
      },
      error: null
    });
    locals.mockFrom.mockReturnValue(chain);

    await expect(
      load({
        params: { gameId: 'game-1' },
        locals
      } as never)
    ).rejects.toEqual(expect.objectContaining({ status: 403 }));
  });

  it('returns game data for red player', async () => {
    const locals = createMockLocals({ id: 'user-1' });
    let callCount = 0;

    locals.mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // games query
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 'game-1',
            red_player: 'user-1',
            blue_player: 'user-2',
            status: 'started',
            time_control: { timeMinutes: 5, incrementSeconds: 0 },
            started_at: '2024-01-01T00:00:00Z',
            winner: null,
            result_reason: null
          },
          error: null
        });
        return chain;
      }
      if (callCount === 2) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.single = vi.fn().mockResolvedValue({
          data: {
            move_history: [],
            fen: 'fen',
            phase: 'deploying',
            clocks: { red: 300_000, blue: 300_000 },
            disconnect_red_at: null,
            disconnect_blue_at: null,
            clocks_paused: false
          },
          error: null
        });
        return chain;
      }
      // profile query
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockResolvedValue({
        data: { display_name: 'Player Two' },
        error: null
      });
      return chain;
    });

    const result = (await load({
      params: { gameId: 'game-1' },
      locals
    } as never)) as {
      game: { id: string; status: string };
      gameState: { phase: string };
      currentUserId: string;
      playerColor: string;
      opponent: { id: string; displayName: string };
    };

    expect(result.game.id).toBe('game-1');
    expect(result.game.status).toBe('started');
    expect(result.gameState.phase).toBe('deploying');
    expect(result.currentUserId).toBe('user-1');
    expect(result.playerColor).toBe('red');
    expect(result.opponent.id).toBe('user-2');
    expect(result.opponent.displayName).toBe('Player Two');
  });

  it('returns game data for blue player', async () => {
    const locals = createMockLocals({ id: 'user-2' });
    let callCount = 0;

    locals.mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 'game-1',
            red_player: 'user-1',
            blue_player: 'user-2',
            status: 'started',
            time_control: { timeMinutes: 10, incrementSeconds: 5 },
            started_at: '2024-01-01T00:00:00Z',
            winner: null,
            result_reason: null
          },
          error: null
        });
        return chain;
      }
      if (callCount === 2) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.single = vi.fn().mockResolvedValue({
          data: {
            move_history: [],
            fen: 'fen',
            phase: 'deploying',
            clocks: { red: 600_000, blue: 600_000 },
            disconnect_red_at: null,
            disconnect_blue_at: null,
            clocks_paused: false
          },
          error: null
        });
        return chain;
      }
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockResolvedValue({
        data: { display_name: 'Player One' },
        error: null
      });
      return chain;
    });

    const result = (await load({
      params: { gameId: 'game-1' },
      locals
    } as never)) as {
      currentUserId: string;
      playerColor: string;
      opponent: { id: string; displayName: string };
    };

    expect(result.currentUserId).toBe('user-2');
    expect(result.playerColor).toBe('blue');
    expect(result.opponent.id).toBe('user-1');
    expect(result.opponent.displayName).toBe('Player One');
  });
});
