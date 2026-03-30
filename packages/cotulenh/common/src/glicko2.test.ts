import { describe, it, expect } from 'vitest';
import { calculateGlicko2, calculateGlicko2RatingPeriod, GLICKO2_DEFAULTS } from './glicko2.js';

describe('Glicko-2 algorithm', () => {
  describe('defaults', () => {
    it('has standard Glicko-2 default values', () => {
      expect(GLICKO2_DEFAULTS.rating).toBe(1500);
      expect(GLICKO2_DEFAULTS.rd).toBe(350);
      expect(GLICKO2_DEFAULTS.volatility).toBe(0.06);
    });
  });

  describe('calculateGlicko2 - Glickman paper reference test', () => {
    // Reference: Mark Glickman's "Example of the Glicko-2 System"
    // Player: rating=1500, RD=200, vol=0.06
    // Plays 3 games against:
    //   Opponent 1: rating=1400, RD=30  -> Win  (score=1.0)
    //   Opponent 2: rating=1550, RD=100 -> Loss (score=0.0)
    //   Opponent 3: rating=1700, RD=300 -> Loss (score=0.0)
    //
    // After processing all 3 games sequentially (single-game updates),
    // the final values should approximate the paper's results.
    // The paper processes all 3 simultaneously in a rating period,
    // but we process one at a time, so results will differ slightly.

    it('processes a win against a lower-rated opponent', () => {
      const result = calculateGlicko2(
        { rating: 1500, rd: 200, volatility: 0.06 },
        { rating: 1400, rd: 30 },
        1.0
      );

      // Rating should increase after a win against a lower-rated opponent
      expect(result.rating).toBeGreaterThan(1500);
      // RD should decrease (more certainty after a game)
      expect(result.rd).toBeLessThan(200);
      // Volatility should remain reasonable
      expect(result.volatility).toBeGreaterThan(0);
      expect(result.volatility).toBeLessThan(0.2);
    });

    it('processes a loss against a higher-rated opponent', () => {
      const result = calculateGlicko2(
        { rating: 1500, rd: 200, volatility: 0.06 },
        { rating: 1550, rd: 100 },
        0.0
      );

      // Rating should decrease after a loss
      expect(result.rating).toBeLessThan(1500);
      // RD should decrease
      expect(result.rd).toBeLessThan(200);
      expect(result.volatility).toBeGreaterThan(0);
    });

    it('processes a draw', () => {
      const result = calculateGlicko2(
        { rating: 1500, rd: 200, volatility: 0.06 },
        { rating: 1500, rd: 200 },
        0.5
      );

      // Rating should stay roughly the same for equal opponents drawing
      expect(Math.abs(result.rating - 1500)).toBeLessThan(5);
      // RD should decrease
      expect(result.rd).toBeLessThan(200);
    });

    it('matches the published Glickman example for a full rating period', () => {
      const player = calculateGlicko2RatingPeriod({ rating: 1500, rd: 200, volatility: 0.06 }, [
        { opponent: { rating: 1400, rd: 30 }, score: 1.0 },
        { opponent: { rating: 1550, rd: 100 }, score: 0.0 },
        { opponent: { rating: 1700, rd: 300 }, score: 0.0 }
      ]);

      // Reference: Mark Glickman, "Example of the Glicko-2 System"
      expect(player.rating).toBe(1464);
      expect(player.rd).toBe(152);
      expect(player.volatility).toBe(0.059996);
    });
  });

  describe('edge cases', () => {
    it('handles two default players', () => {
      const result = calculateGlicko2(
        { rating: 1500, rd: 350, volatility: 0.06 },
        { rating: 1500, rd: 350 },
        1.0
      );

      expect(result.rating).toBeGreaterThan(1500);
      expect(result.rd).toBeLessThan(350);
      expect(result.volatility).toBeGreaterThan(0);
    });

    it('handles very high RD (new player)', () => {
      const result = calculateGlicko2(
        { rating: 1500, rd: 350, volatility: 0.06 },
        { rating: 2000, rd: 50 },
        0.0
      );

      // New player losing to strong opponent: rating drops but RD also drops
      expect(result.rating).toBeLessThan(1500);
      expect(result.rd).toBeLessThan(350);
    });

    it('returns integer rating and rd, 6-decimal volatility', () => {
      const result = calculateGlicko2(
        { rating: 1500, rd: 200, volatility: 0.06 },
        { rating: 1400, rd: 30 },
        1.0
      );

      expect(Number.isInteger(result.rating)).toBe(true);
      expect(Number.isInteger(result.rd)).toBe(true);
      // Volatility should be a number with reasonable precision
      expect(typeof result.volatility).toBe('number');
      expect(result.volatility).toBeGreaterThan(0);
    });

    it('is symmetric — winner gains roughly what loser loses for equal RD', () => {
      const winner = calculateGlicko2(
        { rating: 1500, rd: 200, volatility: 0.06 },
        { rating: 1500, rd: 200 },
        1.0
      );
      const loser = calculateGlicko2(
        { rating: 1500, rd: 200, volatility: 0.06 },
        { rating: 1500, rd: 200 },
        0.0
      );

      // The sum of changes should be roughly zero (not exact due to volatility)
      const totalChange = winner.rating - 1500 + (loser.rating - 1500);
      expect(Math.abs(totalChange)).toBeLessThan(10);
    });
  });
});
