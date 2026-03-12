import { render, screen } from '@testing-library/react';
import { Swords } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('renders message text', () => {
    render(
      <EmptyState icon={Swords} message="No games" actionLabel="Play now" actionHref="/play" />
    );
    expect(screen.getByText('No games')).toBeInTheDocument();
  });

  it('renders action link with correct href', () => {
    render(
      <EmptyState icon={Swords} message="No games" actionLabel="Play now" actionHref="/play" />
    );
    const link = screen.getByRole('link', { name: 'Play now' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/play');
    expect(link).toHaveAttribute('aria-label', 'Play now');
  });

  it('renders the icon', () => {
    const { container } = render(
      <EmptyState icon={Swords} message="No games" actionLabel="Play now" actionHref="/play" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
