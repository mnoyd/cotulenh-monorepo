import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SubjectGridSkeleton } from '../subject-grid-skeleton';

describe('SubjectGridSkeleton', () => {
  it('renders skeleton placeholders', () => {
    const { container } = render(<SubjectGridSkeleton />);
    const skeletonItems = container.querySelectorAll('[data-testid="skeleton-card"]');
    expect(skeletonItems.length).toBeGreaterThanOrEqual(6);
  });

  it('has animate-pulse class', () => {
    const { container } = render(<SubjectGridSkeleton />);
    const pulseElement = container.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });
});
