import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityLeaderboardTable } from '../activity-leaderboard-table';

const entries = [
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
];

describe('ActivityLeaderboardTable', () => {
  it('renders rows for leaderboard entries', () => {
    render(
      <ActivityLeaderboardTable entries={entries} currentUserId="u1" page={1} totalPages={1} />
    );

    expect(screen.getByTestId('leaderboard-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-row-2')).toBeInTheDocument();
  });

  it('highlights the current user row', () => {
    render(
      <ActivityLeaderboardTable entries={entries} currentUserId="u1" page={1} totalPages={1} />
    );

    expect(screen.getByTestId('leaderboard-row-1').className).toContain(
      'bg-[var(--color-surface-elevated)]'
    );
  });

  it('renders pinned current user when they are off the current page', () => {
    render(
      <ActivityLeaderboardTable
        entries={entries}
        currentUserId="u3"
        pinnedCurrentUser={{
          userId: 'u3',
          displayName: 'Nguoi choi 3',
          rating: 1500,
          ratingGamesPlayed: 5,
          gamesPlayed: 3,
          lastActiveAt: '2026-03-28T10:00:00Z',
          rank: 14
        }}
        page={1}
        totalPages={3}
      />
    );

    expect(screen.getByTestId('leaderboard-current-user-pinned')).toBeInTheDocument();
    expect(screen.getByText('#14 Nguoi choi 3')).toBeInTheDocument();
  });

  it('shows pagination controls when there is more than one page', () => {
    render(
      <ActivityLeaderboardTable entries={entries} currentUserId="u1" page={2} totalPages={3} />
    );

    expect(screen.getByRole('link', { name: 'Trang trước' })).toHaveAttribute(
      'href',
      '/leaderboard?page=1'
    );
    expect(screen.getByRole('link', { name: 'Trang sau' })).toHaveAttribute(
      'href',
      '/leaderboard?page=3'
    );
  });
});
