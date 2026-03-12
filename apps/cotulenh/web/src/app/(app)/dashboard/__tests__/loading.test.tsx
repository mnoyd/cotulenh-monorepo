import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DashboardLoading from '../loading';

describe('DashboardLoading', () => {
  it('renders skeleton elements with pulse animation', () => {
    const { container } = render(<DashboardLoading />);
    const pulseElement = container.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });

  it('renders 3 card-shaped skeleton placeholders', () => {
    const { container } = render(<DashboardLoading />);
    const skeletonCards = container.querySelectorAll('.h-32');
    expect(skeletonCards).toHaveLength(3);
  });

  it('uses design token background color for skeletons', () => {
    const { container } = render(<DashboardLoading />);
    const skeletonElements = container.querySelectorAll(
      '.bg-\\[var\\(--color-surface-elevated\\)\\]'
    );
    expect(skeletonElements.length).toBeGreaterThan(0);
  });
});
