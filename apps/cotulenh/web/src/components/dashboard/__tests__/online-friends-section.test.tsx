import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OnlineFriendsSection } from '../online-friends-section';

describe('OnlineFriendsSection', () => {
  it('renders section heading', () => {
    render(<OnlineFriendsSection />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Bạn bè trực tuyến' })
    ).toBeInTheDocument();
  });

  it('renders empty state with correct message', () => {
    render(<OnlineFriendsSection />);
    expect(screen.getByText('Không có bạn trực tuyến')).toBeInTheDocument();
  });

  it('renders empty state action link to /friends', () => {
    render(<OnlineFriendsSection />);
    const link = screen.getByRole('link', { name: 'Mời bạn bè chơi' });
    expect(link).toHaveAttribute('href', '/friends');
  });
});
