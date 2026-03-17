import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import GameLoading from '../loading';

describe('GameLoading', () => {
  it('renders skeleton placeholders for board and side panel', () => {
    const { container } = render(<GameLoading />);

    const boardSkeleton = container.querySelector('.aspect-square.animate-pulse');
    expect(boardSkeleton).toBeTruthy();
    expect(boardSkeleton?.className).toContain('min-w-[min(60vw,60svh)]');

    const pulseBlocks = container.querySelectorAll('.animate-pulse');
    expect(pulseBlocks.length).toBeGreaterThanOrEqual(4);
  });
});
