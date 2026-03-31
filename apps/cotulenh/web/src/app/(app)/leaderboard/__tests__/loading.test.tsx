import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LeaderboardLoading from '../loading';

describe('LeaderboardLoading', () => {
  it('renders loading placeholders', () => {
    const { container } = render(<LeaderboardLoading />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(container.querySelectorAll('.bg-\\[var\\(--color-surface-elevated\\)\\]').length).toBe(
      6
    );
  });
});
