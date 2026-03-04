import { describe, it, expect, vi } from 'vitest';

vi.mock('@cotulenh/common', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

import { load } from './+page.server';

describe('game history page server', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
  };

  function createMockEvent(userId: string) {
    mockSupabase = {
      from: vi.fn()
    };
    return {
      locals: {
        supabase: mockSupabase,
        safeGetSession: vi.fn().mockResolvedValue({
          user: { id: userId }
        })
      }
    } as unknown as Parameters<typeof load>[0];
  }

  function mockGamesQuery(result: { data: unknown; error: unknown }) {
    const orderMock = vi.fn().mockResolvedValue(result);
    const neqMock = vi.fn().mockReturnValue({ order: orderMock });
    const orMock = vi.fn().mockReturnValue({ neq: neqMock });
    const selectMock = vi.fn().mockReturnValue({ or: orMock });

    mockSupabase.from.mockReturnValue({ select: selectMock });

    return { selectMock, orMock, neqMock, orderMock };
  }

  describe('load function', () => {
    it('returns game list with correctly transformed camelCase data', async () => {
      const event = createMockEvent('user-1');
      mockGamesQuery({
        data: [
          {
            id: 'game-1',
            status: 'checkmate',
            winner: 'red',
            result_reason: 'checkmate',
            time_control: { timeMinutes: 10, incrementSeconds: 5 },
            started_at: '2026-03-01T10:00:00Z',
            ended_at: '2026-03-01T10:30:00Z',
            red_player: 'user-1',
            blue_player: 'user-2',
            red_profile: { display_name: 'Player1' },
            blue_profile: { display_name: 'Player2' }
          }
        ],
        error: null
      });

      const result = (await load(event)) as Record<string, unknown>;
      const games = result.games as Array<Record<string, unknown>>;

      expect(games).toHaveLength(1);
      expect(games[0].id).toBe('game-1');
      expect(games[0].opponentDisplayName).toBe('Player2');
      expect(games[0].playerColor).toBe('red');
      expect(games[0].resultReason).toBe('checkmate');
      expect(games[0].timeControl).toEqual({ timeMinutes: 10, incrementSeconds: 5 });
    });

    it('returns empty array for user with no completed games', async () => {
      const event = createMockEvent('user-1');
      mockGamesQuery({
        data: [],
        error: null
      });

      const result = (await load(event)) as Record<string, unknown>;
      const games = result.games as Array<unknown>;

      expect(games).toEqual([]);
    });

    it('handles Supabase query error (returns empty array)', async () => {
      const event = createMockEvent('user-1');
      mockGamesQuery({
        data: null,
        error: { message: 'DB error' }
      });

      const result = (await load(event)) as Record<string, unknown>;
      const games = result.games as Array<unknown>;

      expect(games).toEqual([]);
    });

    it('filters out status = started games via neq filter', async () => {
      const event = createMockEvent('user-1');
      const { neqMock } = mockGamesQuery({
        data: [],
        error: null
      });

      await load(event);

      expect(neqMock).toHaveBeenCalledWith('status', 'started');
    });

    it('correctly identifies opponent and player color', async () => {
      const event = createMockEvent('user-2');
      mockGamesQuery({
        data: [
          {
            id: 'game-1',
            status: 'resign',
            winner: 'blue',
            result_reason: 'resignation',
            time_control: { timeMinutes: 5, incrementSeconds: 0 },
            started_at: '2026-03-01T10:00:00Z',
            ended_at: '2026-03-01T10:10:00Z',
            red_player: 'user-1',
            blue_player: 'user-2',
            red_profile: { display_name: 'RedPlayer' },
            blue_profile: { display_name: 'BluePlayer' }
          }
        ],
        error: null
      });

      const result = (await load(event)) as Record<string, unknown>;
      const games = result.games as Array<Record<string, unknown>>;

      expect(games[0].opponentDisplayName).toBe('RedPlayer');
      expect(games[0].playerColor).toBe('blue');
    });
  });
});
