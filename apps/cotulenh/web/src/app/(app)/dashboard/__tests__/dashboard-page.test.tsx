import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/dashboard/quick-actions', () => ({
  QuickActions: () => <div data-testid="quick-actions" />
}));

vi.mock('@/components/dashboard/active-games-section', () => ({
  ActiveGamesSection: () => <div data-testid="active-games-section" />
}));

vi.mock('@/components/dashboard/recent-games-section', () => ({
  RecentGamesSection: () => <div data-testid="recent-games-section" />
}));

vi.mock('@/components/dashboard/online-friends-section', () => ({
  OnlineFriendsSection: () => <div data-testid="online-friends-section" />
}));

vi.mock('@/components/dashboard/leaderboard-section', () => ({
  LeaderboardSection: () => <div data-testid="leaderboard-section" />
}));

import DashboardPage from '../page';

describe('DashboardPage', () => {
  it('renders navigation cards for play, active games, and recent games', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('link', { name: 'Chơi' })).toHaveAttribute('href', '/play');
    expect(screen.getByRole('link', { name: 'Ván đang chơi' })).toHaveAttribute(
      'href',
      '#active-games'
    );
    expect(screen.getByRole('link', { name: 'Ván gần đây' })).toHaveAttribute(
      'href',
      '#recent-games'
    );
  });

  it('renders all 5 dashboard sections', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('active-games-section')).toBeInTheDocument();
    expect(screen.getByTestId('recent-games-section')).toBeInTheDocument();
    expect(screen.getByTestId('online-friends-section')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-section')).toBeInTheDocument();
  });

  it('uses responsive grid layout', () => {
    const { container } = render(<DashboardPage />);
    const grid = container.firstElementChild;
    expect(grid?.className).toContain('grid');
    expect(grid?.className).toContain('lg:grid-cols-[1fr_320px]');
  });
});
