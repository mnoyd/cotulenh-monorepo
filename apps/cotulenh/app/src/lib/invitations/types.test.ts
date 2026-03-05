import { describe, it, expect } from 'vitest';
import { TIME_PRESETS, type GameConfig } from './types';

describe('TIME_PRESETS', () => {
  it('has exactly 9 presets', () => {
    expect(TIME_PRESETS).toHaveLength(9);
  });

  it('each preset has valid config', () => {
    for (const preset of TIME_PRESETS) {
      expect(preset.label).toMatch(/^\d+\+\d+$/);
      expect(preset.config.timeMinutes).toBeGreaterThanOrEqual(1);
      expect(preset.config.timeMinutes).toBeLessThanOrEqual(60);
      expect(preset.config.incrementSeconds).toBeGreaterThanOrEqual(0);
      expect(preset.config.incrementSeconds).toBeLessThanOrEqual(30);
    }
  });

  it('includes expected presets in order', () => {
    const labels = TIME_PRESETS.map((p) => p.label);
    expect(labels).toEqual(['1+0', '2+1', '3+0', '3+2', '5+0', '5+3', '10+0', '15+10', '30+0']);
  });
});
