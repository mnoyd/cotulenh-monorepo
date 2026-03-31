import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { RatingChangeDisplay } from '../rating-change-display';

describe('RatingChangeDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when change is null', () => {
    const { container } = render(<RatingChangeDisplay change={null} />);
    expect(container.textContent).toBe('');
  });

  it('renders the gain state with accessible live region', () => {
    render(<RatingChangeDisplay change={{ old: 1492, new: 1504, delta: 12 }} />);

    const display = screen.getByTestId('rating-change-display');
    expect(display.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByTestId('rating-change-old').textContent).toBe('1492');
  });

  it('animates toward the final value when motion is enabled', () => {
    render(<RatingChangeDisplay change={{ old: 1492, new: 1504, delta: 12 }} />);

    expect(screen.getByTestId('rating-change-new').textContent).toBe('1492');

    act(() => {
      vi.advanceTimersByTime(520);
    });

    expect(screen.getByTestId('rating-change-new').textContent).toBe('1504');
    expect(screen.getByTestId('rating-change-delta').textContent).toBe('(+12)');
  });

  it('renders losses in the error color', () => {
    render(<RatingChangeDisplay change={{ old: 1510, new: 1498, delta: -12 }} />);

    expect(screen.getByTestId('rating-change-delta').className).toContain(
      'text-[var(--color-error)]'
    );
  });

  it('renders zero change in muted color', () => {
    render(<RatingChangeDisplay change={{ old: 1500, new: 1500, delta: 0 }} />);

    act(() => {
      vi.advanceTimersByTime(520);
    });

    expect(screen.getByTestId('rating-change-delta').textContent).toBe('(0)');
    expect(screen.getByTestId('rating-change-delta').className).toContain(
      'text-[var(--color-text-muted)]'
    );
  });

  it('skips animation when reduced motion is enabled', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });

    render(<RatingChangeDisplay change={{ old: 1492, new: 1504, delta: 12 }} />);

    expect(screen.getByTestId('rating-change-new').textContent).toBe('1504');
    expect(screen.getByTestId('rating-change-delta').textContent).toBe('(+12)');
  });
});
