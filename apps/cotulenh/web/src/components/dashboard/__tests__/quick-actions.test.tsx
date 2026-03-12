import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QuickActions } from '../quick-actions';

describe('QuickActions', () => {
  it('renders 4 action cards', () => {
    render(<QuickActions />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
  });

  it('renders Vietnamese labels', () => {
    render(<QuickActions />);
    expect(screen.getByText('Chơi với AI')).toBeInTheDocument();
    expect(screen.getByText('Tạo ván đấu')).toBeInTheDocument();
    expect(screen.getByText('Giải đấu')).toBeInTheDocument();
    expect(screen.getByText('Học')).toBeInTheDocument();
  });

  it('has correct hrefs', () => {
    render(<QuickActions />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/play');
    expect(links[1]).toHaveAttribute('href', '/play');
    expect(links[2]).toHaveAttribute('href', '/play');
    expect(links[3]).toHaveAttribute('href', '/learn');
  });

  it('has aria-labels on all cards', () => {
    render(<QuickActions />);
    expect(screen.getByLabelText('Chơi với AI')).toBeInTheDocument();
    expect(screen.getByLabelText('Tạo ván đấu')).toBeInTheDocument();
    expect(screen.getByLabelText('Giải đấu')).toBeInTheDocument();
    expect(screen.getByLabelText('Học')).toBeInTheDocument();
  });

  it('renders icons', () => {
    const { container } = render(<QuickActions />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(4);
  });
});
