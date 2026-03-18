import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { ChessClock } from '../chess-clock';

describe('ChessClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Task 1.1: Basic rendering
  it('renders with timeMs prop', () => {
    render(<ChessClock timeMs={600000} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByRole('timer')).toBeDefined();
  });

  // Task 1.3: Format M:SS normally
  it('formats time as M:SS when above 10 seconds', () => {
    render(<ChessClock timeMs={600000} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByText('10:00')).toBeDefined();
  });

  it('formats time as M:SS for partial minutes', () => {
    render(<ChessClock timeMs={65000} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByText('1:05')).toBeDefined();
  });

  it('formats time as 0:30 for 30 seconds', () => {
    render(<ChessClock timeMs={30000} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByText('0:30')).toBeDefined();
  });

  // Task 1.3: Format M:SS.T when under 10 seconds
  it('formats time with tenths when under 10 seconds', () => {
    render(<ChessClock timeMs={9300} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByText('0:09.3')).toBeDefined();
  });

  it('formats time with tenths at boundary (9999ms)', () => {
    render(<ChessClock timeMs={9999} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByText('0:09.9')).toBeDefined();
  });

  it('formats 0ms as 0:00.0', () => {
    render(<ChessClock timeMs={0} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByText('0:00.0')).toBeDefined();
  });

  it('formats time at exactly 10 seconds as M:SS (no tenths)', () => {
    render(<ChessClock timeMs={10000} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByText('0:10')).toBeDefined();
  });

  // Task 1.2: Countdown when running
  it('counts down when isRunning is true', () => {
    render(<ChessClock timeMs={600000} isRunning={true} isPlayerClock={true} />);
    expect(screen.getByText('10:00')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('9:59')).toBeDefined();
  });

  it('does not count down when isRunning is false', () => {
    render(<ChessClock timeMs={600000} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByText('10:00')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('10:00')).toBeDefined();
  });

  it('stops countdown at 0', () => {
    render(<ChessClock timeMs={500} isRunning={true} isPlayerClock={true} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('0:00.0')).toBeDefined();
  });

  it('resets local countdown when timeMs prop changes (server sync)', () => {
    const { rerender } = render(
      <ChessClock timeMs={600000} isRunning={true} isPlayerClock={true} />
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('9:58')).toBeDefined();

    // Server sync arrives with authoritative value
    rerender(<ChessClock timeMs={598500} isRunning={true} isPlayerClock={true} />);
    expect(screen.getByText('9:58')).toBeDefined();
  });

  // Task 1.6: role="timer" always
  it('has role="timer" always', () => {
    render(<ChessClock timeMs={600000} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByRole('timer')).toBeDefined();
  });

  // Task 1.6: aria-live="polite" when critical
  it('timer keeps aria-live off to avoid tick-by-tick announcements', () => {
    render(<ChessClock timeMs={25000} isRunning={false} isPlayerClock={false} />);
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-live')).toBe('off');
  });

  it('has aria-live="off" when above 30 seconds', () => {
    render(<ChessClock timeMs={600000} isRunning={false} isPlayerClock={false} />);
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-live')).toBe('off');
  });

  it('announces once when crossing into critical time', () => {
    const { rerender } = render(
      <ChessClock timeMs={31000} isRunning={false} isPlayerClock={false} />
    );
    expect(screen.queryByText('Con duoi 30 giay')).toBeNull();

    rerender(<ChessClock timeMs={29000} isRunning={false} isPlayerClock={false} />);
    expect(screen.getByText('Con duoi 30 giay')).toBeDefined();

    rerender(<ChessClock timeMs={28000} isRunning={false} isPlayerClock={false} />);
    expect(screen.getAllByText('Con duoi 30 giay').length).toBe(1);
  });

  // Task 1.4: Critical styles
  it('applies critical text class when under 30 seconds', () => {
    const { container } = render(
      <ChessClock timeMs={25000} isRunning={false} isPlayerClock={false} />
    );
    const timer = container.querySelector('[role="timer"]')!;
    expect(timer.className).toContain('text-[var(--color-clock-critical)]');
  });

  it('applies pulse animation class when under 10 seconds', () => {
    const { container } = render(
      <ChessClock timeMs={8000} isRunning={false} isPlayerClock={false} />
    );
    const timer = container.querySelector('[role="timer"]')!;
    expect(timer.className).toContain('animate-clock-pulse');
  });

  it('does not apply critical styles when above 30 seconds', () => {
    const { container } = render(
      <ChessClock timeMs={600000} isRunning={false} isPlayerClock={false} />
    );
    const timer = container.querySelector('[role="timer"]')!;
    expect(timer.className).not.toContain('text-[var(--color-clock-critical)]');
    expect(timer.className).not.toContain('animate-clock-pulse');
  });

  // Task 1.7: Monospace tabular figures
  it('has monospace font with tabular-nums', () => {
    const { container } = render(
      <ChessClock timeMs={600000} isRunning={false} isPlayerClock={false} />
    );
    const timer = container.querySelector('[role="timer"]')!;
    expect(timer.className).toContain('font-[family-name:var(--font-mono)]');
    expect(timer.className).toContain('tabular-nums');
  });
});
