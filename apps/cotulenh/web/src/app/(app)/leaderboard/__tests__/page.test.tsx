import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/leaderboard', () => ({
  getActivityLeaderboard: vi.fn().mockResolvedValue({
    currentUserId: 'u1',
    currentUserEntry: {
      userId: 'u1',
      displayName: 'Nguoi choi 1',
      rating: 1610,
      ratingGamesPlayed: 42,
      gamesPlayed: 12,
      lastActiveAt: '2026-03-31T10:00:00Z',
      rank: 1
    },
    entries: [
      {
        userId: 'u1',
        displayName: 'Nguoi choi 1',
        rating: 1610,
        ratingGamesPlayed: 42,
        gamesPlayed: 12,
        lastActiveAt: '2026-03-31T10:00:00Z',
        rank: 1
      },
      {
        userId: 'u2',
        displayName: 'Nguoi choi 2',
        rating: 1498,
        ratingGamesPlayed: 12,
        gamesPlayed: 7,
        lastActiveAt: '2026-03-30T10:00:00Z',
        rank: 2
      }
    ]
  })
}));

import LeaderboardPage from '../page';

describe('LeaderboardPage', () => {
  it('renders the leaderboard heading and rows', async () => {
    render(await LeaderboardPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bảng xếp hạng hoạt động' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-row-2')).toBeInTheDocument();
  });
});
