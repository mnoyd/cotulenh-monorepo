import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LeaderboardSection } from '../leaderboard-section';

describe('LeaderboardSection', () => {
  it('renders section heading', () => {
    render(<LeaderboardSection />);
    expect(screen.getByRole('heading', { level: 2, name: 'Bảng xếp hạng' })).toBeInTheDocument();
  });

  it('renders empty state with correct message', () => {
    render(<LeaderboardSection />);
    expect(screen.getByText('Chơi để lên bảng xếp hạng')).toBeInTheDocument();
  });

  it('renders empty state action link to /play', () => {
    render(<LeaderboardSection />);
    const link = screen.getByRole('link', { name: 'Tìm đối thủ' });
    expect(link).toHaveAttribute('href', '/play');
  });
});
