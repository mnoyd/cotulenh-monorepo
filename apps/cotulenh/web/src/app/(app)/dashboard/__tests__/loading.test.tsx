import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DashboardLoading from '../loading';

describe('DashboardLoading', () => {
  it('renders skeleton elements with pulse animation', () => {
    const { container } = render(<DashboardLoading />);
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('renders two-column grid skeleton on desktop', () => {
    const { container } = render(<DashboardLoading />);
    const grid = container.firstElementChild;
    expect(grid?.className).toContain('lg:grid-cols-[1fr_320px]');
  });

  it('renders 4 quick-action skeleton cards', () => {
    const { container } = render(<DashboardLoading />);
    const quickActionSkeletons = container.querySelectorAll('.h-\\[100px\\]');
    expect(quickActionSkeletons).toHaveLength(4);
  });

  it('uses design token background color for skeletons', () => {
    const { container } = render(<DashboardLoading />);
    const skeletonElements = container.querySelectorAll(
      '.bg-\\[var\\(--color-surface-elevated\\)\\]'
    );
    expect(skeletonElements.length).toBeGreaterThan(0);
  });
});
