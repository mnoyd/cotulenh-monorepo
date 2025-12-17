/**
 * Helper function to create a Vitest configuration for a package
 * @param {import('vitest/config').UserConfig} config - Additional configuration to merge with the preset
 * @returns {import('vitest/config').UserConfig} - The merged configuration
 */
import preset from './vitest.preset.js';
import { mergeConfig } from 'vitest/config';

export function createVitestConfig(config = {}) {
  return mergeConfig(preset, config);
}
