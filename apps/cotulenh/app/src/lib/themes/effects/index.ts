/**
 * Effects Module
 *
 * Re-exports effect plugin system and built-in effects.
 */

// Plugin system
export {
  type EffectPlugin,
  registerEffect,
  unregisterEffect,
  getEffect,
  getAllEffects,
  startEffect,
  stopEffect,
  stopAllEffects,
  updateEffectConfig,
  isEffectRunning,
  setEffectCanvas,
  applyThemeEffects
} from './plugin.js';

// Built-in effects
export { radarSweepEffect } from './radar.js';

// Register built-in effects on import
import { registerEffect } from './plugin.js';
import { radarSweepEffect } from './radar.js';

// Auto-register built-in effects
registerEffect(radarSweepEffect);
