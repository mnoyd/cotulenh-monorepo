import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActiveGamesSection } from '../active-games-section';

describe('ActiveGamesSection', () => {
  it('renders section heading', () => {
    render(<ActiveGamesSection />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Ván đấu đang chơi' })
    ).toBeInTheDocument();
  });

  it('renders empty state with correct message', () => {
    render(<ActiveGamesSection />);
    expect(screen.getByText('Không có ván đấu đang diễn ra')).toBeInTheDocument();
  });

  it('renders empty state action link to /play', () => {
    render(<ActiveGamesSection />);
    const link = screen.getByRole('link', { name: 'Tìm đối thủ' });
    expect(link).toHaveAttribute('href', '/play');
  });
});
