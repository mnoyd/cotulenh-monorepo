/**
 * Theme Inheritance
 *
 * Utilities for resolving theme inheritance and merging layers.
 */

import type { ThemeConfig, ResolvedThemeConfig, ThemeId } from '../types.js';

/**
 * Deep merge two objects, with source overriding target
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as object,
        sourceValue as object
      );
    } else if (sourceValue !== undefined) {
      // Override with source value
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Extract layer properties from ThemeConfig
 */
function extractLayers(config: ThemeConfig): Partial<ResolvedThemeConfig> {
  const layers: Partial<ResolvedThemeConfig> = {};

  // First, check direct properties (backward compatibility)
  if (config.colors) layers.colors = config.colors;
  if (config.assets) layers.assets = config.assets;
  if (config.effects) layers.effects = config.effects;
  if (config.filters) layers.filters = config.filters;
  if (config.animations) layers.animations = config.animations;
  if (config.ui) layers.ui = config.ui;
  if (config.shadows) layers.shadows = config.shadows;
  if (config.transitions) layers.transitions = config.transitions;

  // Then, merge in layers property (takes precedence)
  if (config.layers) {
    if (config.layers.colors) {
      layers.colors = layers.colors
        ? deepMerge(layers.colors, config.layers.colors)
        : config.layers.colors;
    }
    if (config.layers.assets) {
      layers.assets = layers.assets
        ? deepMerge(layers.assets, config.layers.assets)
        : config.layers.assets;
    }
    if (config.layers.effects) {
      layers.effects = layers.effects
        ? deepMerge(layers.effects, config.layers.effects)
        : config.layers.effects;
    }
    if (config.layers.filters) {
      layers.filters = layers.filters
        ? deepMerge(layers.filters, config.layers.filters)
        : config.layers.filters;
    }
    if (config.layers.animations) {
      layers.animations = layers.animations
        ? deepMerge(layers.animations, config.layers.animations)
        : config.layers.animations;
    }
    if (config.layers.ui) {
      layers.ui = layers.ui ? deepMerge(layers.ui, config.layers.ui) : config.layers.ui;
    }
    if (config.layers.shadows) {
      layers.shadows = layers.shadows
        ? deepMerge(layers.shadows, config.layers.shadows)
        : config.layers.shadows;
    }
    if (config.layers.transitions) {
      layers.transitions = layers.transitions
        ? deepMerge(layers.transitions, config.layers.transitions)
        : config.layers.transitions;
    }
  }

  return layers;
}

/**
 * Theme registry getter type (injected to avoid circular deps)
 */
export type ThemeGetter = (id: ThemeId) => ThemeConfig | undefined;

/**
 * Resolve theme inheritance, producing a fully resolved config
 *
 * @param config - The theme configuration to resolve
 * @param getTheme - Function to get a theme by ID (from registry)
 * @param visited - Set of visited theme IDs (for cycle detection)
 */
export function resolveTheme(
  config: ThemeConfig,
  getTheme: ThemeGetter,
  visited: Set<string> = new Set()
): ResolvedThemeConfig {
  // Cycle detection
  if (visited.has(config.meta.id)) {
    throw new Error(`Circular theme inheritance detected: ${config.meta.id}`);
  }
  visited.add(config.meta.id);

  // Extract layers from this config
  const thisLayers = extractLayers(config);

  // If no parent, this must be a complete theme
  if (!config.extends) {
    // Validate that all required layers are present
    const resolved: ResolvedThemeConfig = {
      meta: config.meta,
      colors: thisLayers.colors!,
      assets: thisLayers.assets!,
      effects: thisLayers.effects!,
      filters: thisLayers.filters!,
      animations: thisLayers.animations!,
      ui: thisLayers.ui!,
      shadows: thisLayers.shadows!,
      transitions: thisLayers.transitions!
    };

    // Check for missing required properties
    const missing: string[] = [];
    if (!resolved.colors) missing.push('colors');
    if (!resolved.assets) missing.push('assets');
    if (!resolved.effects) missing.push('effects');
    if (!resolved.filters) missing.push('filters');
    if (!resolved.animations) missing.push('animations');
    if (!resolved.ui) missing.push('ui');
    if (!resolved.shadows) missing.push('shadows');
    if (!resolved.transitions) missing.push('transitions');

    if (missing.length > 0) {
      throw new Error(
        `Theme "${config.meta.id}" is missing required layers: ${missing.join(', ')}. ` +
          `Either provide these layers or extend from a base theme.`
      );
    }

    return resolved;
  }

  // Get parent theme
  const parentConfig = getTheme(config.extends);
  if (!parentConfig) {
    throw new Error(
      `Theme "${config.meta.id}" extends "${config.extends}", but parent theme not found`
    );
  }

  // Recursively resolve parent
  const parent = resolveTheme(parentConfig, getTheme, visited);

  // Merge parent with child layers
  const resolved: ResolvedThemeConfig = {
    meta: config.meta,
    colors: thisLayers.colors ? deepMerge(parent.colors, thisLayers.colors) : parent.colors,
    assets: thisLayers.assets ? deepMerge(parent.assets, thisLayers.assets) : parent.assets,
    effects: thisLayers.effects ? deepMerge(parent.effects, thisLayers.effects) : parent.effects,
    filters: thisLayers.filters ? deepMerge(parent.filters, thisLayers.filters) : parent.filters,
    animations: thisLayers.animations
      ? deepMerge(parent.animations, thisLayers.animations)
      : parent.animations,
    ui: thisLayers.ui ? deepMerge(parent.ui, thisLayers.ui) : parent.ui,
    shadows: thisLayers.shadows ? deepMerge(parent.shadows, thisLayers.shadows) : parent.shadows,
    transitions: thisLayers.transitions
      ? deepMerge(parent.transitions, thisLayers.transitions)
      : parent.transitions
  };

  return resolved;
}

/**
 * Check if a theme config is already fully resolved
 */
export function isResolvedTheme(
  config: ThemeConfig | ResolvedThemeConfig
): config is ResolvedThemeConfig {
  return (
    'colors' in config &&
    config.colors !== undefined &&
    'assets' in config &&
    config.assets !== undefined &&
    'extends' in config === false
  );
}
