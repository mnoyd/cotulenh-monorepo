import { describe, it, expect, beforeEach } from 'vitest';
import { LagTracker } from './lag-tracker';

describe('LagTracker', () => {
  let tracker: LagTracker;

  beforeEach(() => {
    tracker = new LagTracker();
  });

  describe('constructor', () => {
    it('initialises with default quota of 500ms', () => {
      expect(tracker.quota).toBe(500);
    });

    it('accepts custom maxQuota and regenPerMove', () => {
      const custom = new LagTracker(1000, 200);
      expect(custom.quota).toBe(1000);
    });
  });

  describe('debit', () => {
    it('returns the full estimated lag when quota covers it', () => {
      const compensation = tracker.debit(200);
      expect(compensation).toBe(200);
      expect(tracker.quota).toBe(300);
    });

    it('returns only remaining quota when lag exceeds it', () => {
      tracker.debit(400); // quota now 100
      const compensation = tracker.debit(200);
      expect(compensation).toBe(100);
      expect(tracker.quota).toBe(0);
    });

    it('returns 0 when quota is depleted', () => {
      tracker.debit(500); // deplete
      const compensation = tracker.debit(100);
      expect(compensation).toBe(0);
      expect(tracker.quota).toBe(0);
    });

    it('handles zero estimated lag', () => {
      const compensation = tracker.debit(0);
      expect(compensation).toBe(0);
      expect(tracker.quota).toBe(500);
    });

    it('clamps negative estimated lag to zero compensation', () => {
      const compensation = tracker.debit(-50);
      expect(compensation).toBe(0);
      expect(tracker.quota).toBe(500);
    });

    it('returns zero for non-finite estimated lag values', () => {
      expect(tracker.debit(Number.NaN)).toBe(0);
      expect(tracker.debit(Number.POSITIVE_INFINITY)).toBe(0);
      expect(tracker.quota).toBe(500);
    });
  });

  describe('regenerate', () => {
    it('adds 100ms per call (default)', () => {
      tracker.debit(500); // deplete to 0
      tracker.regenerate();
      expect(tracker.quota).toBe(100);
    });

    it('caps at maxQuota', () => {
      tracker.debit(50); // quota = 450
      tracker.regenerate(); // 450 + 100 = 550, capped to 500
      expect(tracker.quota).toBe(500);
    });

    it('does not exceed maxQuota on repeated calls', () => {
      tracker.regenerate();
      tracker.regenerate();
      tracker.regenerate();
      expect(tracker.quota).toBe(500);
    });

    it('uses custom regenPerMove value', () => {
      const custom = new LagTracker(500, 200);
      custom.debit(500);
      custom.regenerate();
      expect(custom.quota).toBe(200);
    });
  });

  describe('reset', () => {
    it('restores quota to maxQuota', () => {
      tracker.debit(500);
      expect(tracker.quota).toBe(0);
      tracker.reset();
      expect(tracker.quota).toBe(500);
    });

    it('resets to custom maxQuota', () => {
      const custom = new LagTracker(1000, 100);
      custom.debit(1000);
      custom.reset();
      expect(custom.quota).toBe(1000);
    });
  });

  describe('multi-move scenario', () => {
    it('simulates debit-regenerate cycle across several moves', () => {
      // Move 1: 150ms lag
      expect(tracker.debit(150)).toBe(150); // quota = 350
      tracker.regenerate(); // quota = 450

      // Move 2: 300ms lag
      expect(tracker.debit(300)).toBe(300); // quota = 150
      tracker.regenerate(); // quota = 250

      // Move 3: 400ms lag — only 250 available
      expect(tracker.debit(400)).toBe(250); // quota = 0
      tracker.regenerate(); // quota = 100

      // Move 4: 50ms lag
      expect(tracker.debit(50)).toBe(50); // quota = 50
      tracker.regenerate(); // quota = 150
      expect(tracker.quota).toBe(150);
    });
  });
});
