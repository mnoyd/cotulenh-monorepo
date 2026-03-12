import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RecentGamesSection } from '../recent-games-section';

describe('RecentGamesSection', () => {
  it('renders section heading', () => {
    render(<RecentGamesSection />);
    expect(screen.getByRole('heading', { level: 2, name: 'Ván đấu gần đây' })).toBeInTheDocument();
  });

  it('renders empty state with correct message', () => {
    render(<RecentGamesSection />);
    expect(screen.getByText('Chưa có ván đấu')).toBeInTheDocument();
  });

  it('renders empty state action link to /play', () => {
    render(<RecentGamesSection />);
    const link = screen.getByRole('link', { name: 'Chơi ván đầu tiên' });
    expect(link).toHaveAttribute('href', '/play');
  });
});
