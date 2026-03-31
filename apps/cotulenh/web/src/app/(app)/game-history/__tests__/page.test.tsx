import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetGameHistory } = vi.hoisted(() => ({
  mockGetGameHistory: vi.fn()
}));

vi.mock('@/lib/game-history', () => ({
  getGameHistory: mockGetGameHistory
}));

import GameHistoryPage from '../page';

describe('GameHistoryPage', () => {
  beforeEach(() => {
    mockGetGameHistory.mockClear();
    mockGetGameHistory.mockResolvedValue({
      currentUserId: 'u1',
      totalCount: 2,
      page: 1,
      pageSize: 20,
      games: [
        {
          id: 'game-1',
          opponentDisplayName: 'Nguoi choi A',
          opponentRating: 1610,
          opponentRatingGamesPlayed: 42,
          result: 'win',
          resultReason: 'checkmate',
          resultReasonLabel: 'Chiếu hết',
          timeControl: '15+10',
          endedAt: '2026-03-31T10:00:00Z',
          relativeDate: '2 giờ trước'
        },
        {
          id: 'game-2',
          opponentDisplayName: 'Nguoi choi B',
          opponentRating: 1498,
          opponentRatingGamesPlayed: 12,
          result: 'loss',
          resultReason: 'timeout',
          resultReasonLabel: 'Hết giờ',
          timeControl: '5+0',
          endedAt: '2026-03-30T10:00:00Z',
          relativeDate: '1 ngày trước'
        }
      ]
    });
  });

  it('renders the game history heading and rows', async () => {
    const { getGameHistory } = await import('@/lib/game-history');
    render(await GameHistoryPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole('heading', { level: 1, name: 'Lịch sử đấu' })).toBeInTheDocument();
    expect(screen.getByTestId('history-row-game-1')).toBeInTheDocument();
    expect(screen.getByTestId('history-row-game-2')).toBeInTheDocument();
    expect(getGameHistory).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it('renders empty state when no games', async () => {
    const { getGameHistory } = await import('@/lib/game-history');
    (getGameHistory as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      currentUserId: 'u1',
      totalCount: 0,
      page: 1,
      pageSize: 20,
      games: []
    });

    render(await GameHistoryPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText('Chưa có ván đấu nào')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chơi ngay' })).toHaveAttribute('href', '/play');
  });

  it('uses URL page param for paginated query', async () => {
    const { getGameHistory } = await import('@/lib/game-history');
    (getGameHistory as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      currentUserId: 'u1',
      totalCount: 40,
      page: 2,
      pageSize: 20,
      games: [
        {
          id: 'game-3',
          opponentDisplayName: 'Nguoi choi C',
          opponentRating: 1550,
          opponentRatingGamesPlayed: 30,
          result: 'draw',
          resultReason: 'draw',
          resultReasonLabel: 'Hòa',
          timeControl: '15+10',
          endedAt: '2026-03-30T10:00:00Z',
          relativeDate: '1 ngày trước'
        }
      ]
    });

    render(await GameHistoryPage({ searchParams: Promise.resolve({ page: '2' }) }));

    expect(getGameHistory).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
  });

  it('re-fetches with clamped page when URL page exceeds total pages', async () => {
    const { getGameHistory } = await import('@/lib/game-history');
    (getGameHistory as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        currentUserId: 'u1',
        totalCount: 25,
        page: 99,
        pageSize: 20,
        games: []
      })
      .mockResolvedValueOnce({
        currentUserId: 'u1',
        totalCount: 25,
        page: 2,
        pageSize: 20,
        games: [
          {
            id: 'game-4',
            opponentDisplayName: 'Nguoi choi D',
            opponentRating: 1580,
            opponentRatingGamesPlayed: 31,
            result: 'win',
            resultReason: 'checkmate',
            resultReasonLabel: 'Chiếu hết',
            timeControl: '15+10',
            endedAt: '2026-03-29T10:00:00Z',
            relativeDate: '2 ngày trước'
          }
        ]
      });

    render(await GameHistoryPage({ searchParams: Promise.resolve({ page: '99' }) }));

    expect(getGameHistory).toHaveBeenNthCalledWith(1, { page: 99, pageSize: 20 });
    expect(getGameHistory).toHaveBeenNthCalledWith(2, { page: 2, pageSize: 20 });
    expect(screen.getByTestId('history-row-game-4')).toBeInTheDocument();
  });
});
