import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { ChessClock } from '../chess-clock';

describe('ChessClock — Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 5.1: Clock countdown: verify display decrements when running, stops when paused
  it('display decrements when running, stops when paused', () => {
    const { rerender } = render(
      <ChessClock timeMs={60000} isRunning={true} isPlayerClock={true} />
    );
    expect(screen.getByText('1:00')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('0:57')).toBeDefined();

    // Pause the clock
    rerender(<ChessClock timeMs={57000} isRunning={false} isPlayerClock={true} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // Should still show 0:57 — not counting down while paused
    expect(screen.getByText('0:57')).toBeDefined();
  });

  // 5.2: Clock sync: verify server sync overrides local countdown
  it('server sync overrides local countdown', () => {
    const { rerender } = render(
      <ChessClock timeMs={600000} isRunning={true} isPlayerClock={true} />
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('9:55')).toBeDefined();

    // Server sync arrives with authoritative value (slightly different due to latency)
    rerender(<ChessClock timeMs={595200} isRunning={true} isPlayerClock={true} />);
    expect(screen.getByText('9:55')).toBeDefined();

    // Continue counting from synced value
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('9:54')).toBeDefined();
  });

  // 5.3: Critical warnings: verify visual changes at 30s and 10s thresholds
  it('applies critical text at 30s boundary', () => {
    const { container, rerender } = render(
      <ChessClock timeMs={31000} isRunning={false} isPlayerClock={true} />
    );
    let timer = container.querySelector('[role="timer"]')!;
    expect(timer.className).not.toContain('text-[var(--color-clock-critical)]');

    rerender(<ChessClock timeMs={29000} isRunning={false} isPlayerClock={true} />);
    timer = container.querySelector('[role="timer"]')!;
    expect(timer.className).toContain('text-[var(--color-clock-critical)]');
  });

  it('applies pulse animation at 10s boundary', () => {
    const { container, rerender } = render(
      <ChessClock timeMs={11000} isRunning={false} isPlayerClock={true} />
    );
    let timer = container.querySelector('[role="timer"]')!;
    expect(timer.className).not.toContain('animate-clock-pulse');

    rerender(<ChessClock timeMs={9000} isRunning={false} isPlayerClock={true} />);
    timer = container.querySelector('[role="timer"]')!;
    expect(timer.className).toContain('animate-clock-pulse');
  });

  // 5.4: Clock switching: verify correct clock runs after move confirmation
  it('only active player clock runs', () => {
    // Red clock running, blue clock paused
    const { rerender } = render(
      <div>
        <ChessClock timeMs={600000} isRunning={true} isPlayerClock={true} />
        <ChessClock timeMs={600000} isRunning={false} isPlayerClock={false} />
      </div>
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const timers = screen.getAllByRole('timer');
    expect(timers[0].textContent).toBe('9:58');
    expect(timers[1].textContent).toBe('10:00');

    // Switch: blue now running, red paused with new synced value
    rerender(
      <div>
        <ChessClock timeMs={598000} isRunning={false} isPlayerClock={true} />
        <ChessClock timeMs={600000} isRunning={true} isPlayerClock={false} />
      </div>
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const timersAfter = screen.getAllByRole('timer');
    expect(timersAfter[0].textContent).toBe('9:58');
    expect(timersAfter[1].textContent).toBe('9:59');
  });

  // 5.5: Pause states: verify no countdown during deploy or ended phases
  it('no countdown when both clocks paused (deploy/ended)', () => {
    render(
      <div>
        <ChessClock timeMs={600000} isRunning={false} isPlayerClock={true} />
        <ChessClock timeMs={600000} isRunning={false} isPlayerClock={false} />
      </div>
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const timers = screen.getAllByRole('timer');
    expect(timers[0].textContent).toBe('10:00');
    expect(timers[1].textContent).toBe('10:00');
  });

  // 5.6: Tenths display: verify M:SS.T format when under 10 seconds
  it('shows tenths format during countdown under 10s', () => {
    render(<ChessClock timeMs={9500} isRunning={true} isPlayerClock={true} />);
    expect(screen.getByText('0:09.5')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText('0:09.0')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('0:08.0')).toBeDefined();
  });
});
