import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ChessClockState,
  formatClockTime,
  parseTimeControl,
  type ClockConfig
} from './clock.svelte';

const DEFAULT_CONFIG: ClockConfig = {
  red: { initialTime: 300_000, increment: 2_000 },
  blue: { initialTime: 300_000, increment: 2_000 }
};

describe('ChessClockState', () => {
  let clock: ChessClockState;

  beforeEach(() => {
    vi.useFakeTimers();
    clock = new ChessClockState(DEFAULT_CONFIG);
  });

  afterEach(() => {
    clock.destroy();
    vi.useRealTimers();
  });

  describe('Date.now() delta-based timing', () => {
    it('deducts elapsed time using Date.now()', () => {
      clock.start('r');
      vi.advanceTimersByTime(1000);
      // After 1s, red should have lost ~1000ms (with 100ms tick granularity)
      expect(clock.redTime).toBeLessThanOrEqual(299_100);
      expect(clock.redTime).toBeGreaterThanOrEqual(298_900);
    });

    it('does not deduct time from inactive side', () => {
      clock.start('r');
      vi.advanceTimersByTime(1000);
      expect(clock.blueTime).toBe(300_000);
    });

    it('switches sides and applies increment', () => {
      clock.start('r');
      vi.advanceTimersByTime(500);
      clock.switchSide();
      // Red should have: 300000 - ~500 + 2000 increment
      expect(clock.redTime).toBeGreaterThanOrEqual(301_400);
      expect(clock.redTime).toBeLessThanOrEqual(301_600);
      expect(clock.activeSide).toBe('b');
    });

    it('triggers timeout when time reaches 0', () => {
      const onTimeout = vi.fn();
      clock.onTimeout = onTimeout;
      clock.configure({
        red: { initialTime: 500, increment: 0 },
        blue: { initialTime: 300_000, increment: 0 }
      });
      clock.start('r');
      vi.advanceTimersByTime(600);
      expect(clock.redTime).toBe(0);
      expect(onTimeout).toHaveBeenCalledWith('r');
      expect(clock.status).toBe('timeout');
    });
  });

  describe('getTime / setTime', () => {
    it('getTime returns current time for red', () => {
      expect(clock.getTime('r')).toBe(300_000);
    });

    it('getTime returns current time for blue', () => {
      expect(clock.getTime('b')).toBe(300_000);
    });

    it('setTime updates red time', () => {
      clock.setTime('r', 250_000);
      expect(clock.redTime).toBe(250_000);
      expect(clock.getTime('r')).toBe(250_000);
    });

    it('setTime updates blue time', () => {
      clock.setTime('b', 150_000);
      expect(clock.blueTime).toBe(150_000);
      expect(clock.getTime('b')).toBe(150_000);
    });

    it('setTime does not affect the other side', () => {
      clock.setTime('r', 100_000);
      expect(clock.getTime('b')).toBe(300_000);
    });
  });

  describe('visibilitychange', () => {
    it('catches up elapsed time when tab becomes visible', () => {
      clock.start('r');
      const now = Date.now();
      vi.setSystemTime(now + 5000);

      // Simulate returning to visible tab
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Time should catch up by the full elapsed delta immediately
      expect(clock.redTime).toBe(295_000);
    });

    it('does not tick when tab becomes hidden', () => {
      clock.start('r');
      const timeBefore = clock.redTime;
      const now = Date.now();
      vi.setSystemTime(now + 5000);

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Should not have ticked again from the event
      expect(clock.redTime).toBe(timeBefore);
    });

    it('removes visibilitychange listener on stop', () => {
      const spy = vi.spyOn(document, 'removeEventListener');
      clock.start('r');
      clock.stop();
      expect(spy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      spy.mockRestore();
    });

    it('removes visibilitychange listener on destroy', () => {
      const spy = vi.spyOn(document, 'removeEventListener');
      clock.start('r');
      clock.destroy();
      expect(spy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      spy.mockRestore();
    });
  });

  describe('pause / resume', () => {
    it('pauses and resumes correctly', () => {
      clock.start('r');
      vi.advanceTimersByTime(1000);
      clock.pause();
      const timeAtPause = clock.redTime;
      vi.advanceTimersByTime(5000);
      // Should not have changed during pause
      expect(clock.redTime).toBe(timeAtPause);
      clock.resume();
      vi.advanceTimersByTime(1000);
      expect(clock.redTime).toBeLessThan(timeAtPause);
    });
  });

  describe('reset', () => {
    it('resets to initial configuration', () => {
      clock.start('r');
      vi.advanceTimersByTime(1000);
      clock.reset();
      expect(clock.redTime).toBe(300_000);
      expect(clock.blueTime).toBe(300_000);
      expect(clock.status).toBe('idle');
    });
  });
});

describe('formatClockTime', () => {
  it('formats zero as "0:00"', () => {
    expect(formatClockTime(0)).toBe('0:00');
  });

  it('formats negative as "0:00"', () => {
    expect(formatClockTime(-100)).toBe('0:00');
  });

  it('formats under 1 minute with tenths', () => {
    expect(formatClockTime(45_300)).toBe('45.3');
  });

  it('formats minutes and seconds', () => {
    expect(formatClockTime(300_000)).toBe('5:00');
  });

  it('formats hours', () => {
    expect(formatClockTime(3_600_000)).toBe('1:00:00');
  });
});

describe('parseTimeControl', () => {
  it('parses "5+3" as 5min + 3s increment', () => {
    const tc = parseTimeControl('5+3');
    expect(tc.initialTime).toBe(300_000);
    expect(tc.increment).toBe(3_000);
  });

  it('parses "10+0" as 10min + 0 increment', () => {
    const tc = parseTimeControl('10+0');
    expect(tc.initialTime).toBe(600_000);
    expect(tc.increment).toBe(0);
  });
});
