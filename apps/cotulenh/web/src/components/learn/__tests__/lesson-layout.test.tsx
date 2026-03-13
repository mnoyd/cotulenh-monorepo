import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LessonLayout } from '../lesson-layout';

describe('LessonLayout', () => {
  it('renders board and panel sections', () => {
    render(
      <LessonLayout
        board={<div data-testid="board">Board</div>}
        panel={<div data-testid="panel">Panel</div>}
      />
    );

    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('applies responsive layout classes', () => {
    const { container } = render(
      <LessonLayout board={<div>Board</div>} panel={<div>Panel</div>} />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-col');
    expect(wrapper.className).toContain('lg:flex-row');
  });

  it('board container has 60% width on desktop', () => {
    const { container } = render(
      <LessonLayout board={<div>Board</div>} panel={<div>Panel</div>} />
    );

    const boardContainer = container.querySelector('.lg\\:w-\\[60\\%\\]');
    expect(boardContainer).toBeInTheDocument();
  });

  it('panel has border between board and panel', () => {
    const { container } = render(
      <LessonLayout board={<div>Board</div>} panel={<div>Panel</div>} />
    );

    // Mobile: border-top, Desktop: border-left
    const panel = container.querySelector('.border-t');
    expect(panel).toBeInTheDocument();
  });
});
