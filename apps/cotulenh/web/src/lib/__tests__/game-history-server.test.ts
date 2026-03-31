import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

const mockSelect = vi.fn();
const mockOr = vi.fn();
const mockNeq = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args)
    },
    from: (...args: unknown[]) => mockFrom(...args)
  })
}));

const loadHistory = () => import('../game-history');

const GAME_ROW = {
  id: 'game-1',
  status: 'checkmate',
  winner: 'red',
  result_reason: 'checkmate',
  time_control: { timeMinutes: 15, incrementSeconds: 10 },
  started_at: '2026-03-30T09:00:00Z',
  ended_at: '2026-03-30T09:30:00Z',
  is_rated: true,
  red_player: 'u1',
  blue_player: 'u2',
  red_profile: { display_name: 'Nguoi choi 1', rating: 1600, rating_games_played: 50 },
  blue_profile: { display_name: 'Nguoi choi 2', rating: 1500, rating_games_played: 20 }
};

describe('getGameHistory server query', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockRange.mockResolvedValue({ data: [GAME_ROW], error: null, count: 51 });

    mockOrder.mockReturnValue({ range: mockRange });
    mockNeq.mockReturnValue({ order: mockOrder });
    mockOr.mockReturnValue({ neq: mockNeq });
    mockSelect.mockReturnValue({ or: mockOr });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('uses range pagination and returns total count', async () => {
    const { getGameHistory } = await loadHistory();
    const result = await getGameHistory({ page: 2, pageSize: 20 });

    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('id, status, winner'), {
      count: 'exact'
    });
    expect(mockRange).toHaveBeenCalledWith(20, 39);
    expect(result.totalCount).toBe(51);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.games).toHaveLength(1);
  });

  it('returns empty data for unauthenticated user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { getGameHistory } = await loadHistory();
    const result = await getGameHistory({ page: 3, pageSize: 10 });

    expect(result).toEqual({
      games: [],
      currentUserId: '',
      totalCount: 0,
      page: 3,
      pageSize: 10
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns empty list with user id when query fails', async () => {
    mockRange.mockResolvedValueOnce({ data: null, error: { message: 'boom' }, count: null });
    const { getGameHistory } = await loadHistory();
    const result = await getGameHistory({ page: 1, pageSize: 20 });

    expect(result).toEqual({
      games: [],
      currentUserId: 'u1',
      totalCount: 0,
      page: 1,
      pageSize: 20
    });
  });
});
