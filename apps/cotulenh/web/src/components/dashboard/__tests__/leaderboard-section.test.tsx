import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/leaderboard', () => ({
  getActivityLeaderboard: vi.fn()
}));

import { getActivityLeaderboard } from '@/lib/leaderboard';

import { LeaderboardSection } from '../leaderboard-section';

describe('LeaderboardSection', () => {
  it('renders section heading and top-5 preview rows', async () => {
    vi.mocked(getActivityLeaderboard).mockResolvedValue({
      currentUserId: 'u2',
      currentUserEntry: null,
      entries: Array.from({ length: 6 }, (_, index) => ({
        userId: `u${index + 1}`,
        displayName: `Nguoi choi ${index + 1}`,
        rating: 1500 + index,
        ratingGamesPlayed: 30,
        gamesPlayed: 10 - index,
        lastActiveAt: '2026-03-31T10:00:00Z',
        rank: index + 1
      }))
    });

    render(await LeaderboardSection());

    expect(screen.getByRole('heading', { level: 2, name: 'Bảng xếp hạng' })).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-preview-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-preview-row-5')).toBeInTheDocument();
    expect(screen.queryByText('Nguoi choi 6')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem tất cả' })).toHaveAttribute(
      'href',
      '/leaderboard'
    );
  });

  it('renders empty state when no monthly leaderboard data', async () => {
    vi.mocked(getActivityLeaderboard).mockResolvedValue({
      currentUserId: 'u1',
      currentUserEntry: null,
      entries: []
    });

    render(await LeaderboardSection());

    expect(screen.getByText('Chưa có trận hoàn thành nào trong tháng này')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tìm đối thủ' })).toHaveAttribute('href', '/play');
  });

  it('renders current user position when user is outside top-5 preview', async () => {
    vi.mocked(getActivityLeaderboard).mockResolvedValue({
      currentUserId: 'u7',
      currentUserEntry: {
        userId: 'u7',
        displayName: 'Ban',
        rating: 1480,
        ratingGamesPlayed: 12,
        gamesPlayed: 4,
        lastActiveAt: '2026-03-29T10:00:00Z',
        rank: 7
      },
      entries: Array.from({ length: 6 }, (_, index) => ({
        userId: `u${index + 1}`,
        displayName: `Nguoi choi ${index + 1}`,
        rating: 1500 + index,
        ratingGamesPlayed: 30,
        gamesPlayed: 9 - index,
        lastActiveAt: '2026-03-31T10:00:00Z',
        rank: index + 1
      }))
    });

    render(await LeaderboardSection());

    expect(screen.getByTestId('leaderboard-preview-current-user')).toHaveTextContent('#7 Ban');
  });
});
