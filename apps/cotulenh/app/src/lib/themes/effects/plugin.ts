/**
 * Effect Plugin System
 *
 * Extensible architecture for canvas-based board effects.
 * Allows themes to define custom visual effects (radar, particles, etc.)
 */

import type { ResolvedThemeConfig } from '../types.js';

/**
 * Effect renderer interface
 *
 * Implement this to create custom board effects.
 */
export interface EffectPlugin {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this effect does */
  description?: string;

  /**
   * Initialize the effect
   * Called once when the effect is first enabled.
   */
  init?(canvas: HTMLCanvasElement, config: unknown): void;

  /**
   * Render a single frame
   *
   * @param ctx - Canvas 2D context
   * @param config - Effect-specific configuration from theme
   * @param frame - Current frame number (for animations)
   * @param delta - Time since last frame in ms
   */
  render(ctx: CanvasRenderingContext2D, config: unknown, frame: number, delta: number): void;

  /**
   * Clean up resources
   * Called when the effect is disabled or theme changes.
   */
  dispose?(): void;

  /**
   * Whether this effect should run
   */
  shouldRender?(config: unknown): boolean;
}

/**
 * Effect instance (active effect with state)
 */
interface EffectInstance {
  plugin: EffectPlugin;
  config: unknown;
  frame: number;
  lastTime: number;
}

/**
 * Plugin registry
 */
const plugins = new Map<string, EffectPlugin>();

/**
 * Active effect instances
 */
const activeEffects = new Map<string, EffectInstance>();

/**
 * Animation frame ID (for cancelling)
 */
let animationFrameId: number | null = null;

/**
 * Canvas reference
 */
let effectCanvas: HTMLCanvasElement | null = null;

/**
 * Register an effect plugin
 */
export function registerEffect(plugin: EffectPlugin): void {
  if (plugins.has(plugin.id)) {
    console.warn(`Effect plugin "${plugin.id}" already registered, overwriting`);
  }
  plugins.set(plugin.id, plugin);
}

/**
 * Unregister an effect plugin
 */
export function unregisterEffect(id: string): void {
  // Stop if running
  stopEffect(id);
  plugins.delete(id);
}

/**
 * Get a registered plugin
 */
export function getEffect(id: string): EffectPlugin | undefined {
  return plugins.get(id);
}

/**
 * Get all registered plugins
 */
export function getAllEffects(): EffectPlugin[] {
  return Array.from(plugins.values());
}

/**
 * Start an effect with the given config
 */
export function startEffect(id: string, config: unknown, canvas?: HTMLCanvasElement): void {
  const plugin = plugins.get(id);
  if (!plugin) {
    console.warn(`Effect plugin "${id}" not found`);
    return;
  }

  // Use provided canvas or stored one
  const targetCanvas = canvas || effectCanvas;
  if (!targetCanvas) {
    console.warn(`No canvas available for effect "${id}"`);
    return;
  }

  // Store canvas reference
  effectCanvas = targetCanvas;

  // Initialize if needed
  if (plugin.init) {
    plugin.init(targetCanvas, config);
  }

  // Create instance
  activeEffects.set(id, {
    plugin,
    config,
    frame: 0,
    lastTime: performance.now()
  });

  // Start animation loop if not running
  if (animationFrameId === null) {
    startAnimationLoop();
  }
}

/**
 * Stop an effect
 */
export function stopEffect(id: string): void {
  const instance = activeEffects.get(id);
  if (instance) {
    instance.plugin.dispose?.();
    activeEffects.delete(id);
  }

  // Stop animation loop if no active effects
  if (activeEffects.size === 0 && animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

/**
 * Stop all effects
 */
export function stopAllEffects(): void {
  for (const id of Array.from(activeEffects.keys())) {
    stopEffect(id);
  }
}

/**
 * Update effect configuration
 */
export function updateEffectConfig(id: string, config: unknown): void {
  const instance = activeEffects.get(id);
  if (instance) {
    instance.config = config;
  }
}

/**
 * Check if an effect is running
 */
export function isEffectRunning(id: string): boolean {
  return activeEffects.has(id);
}

/**
 * Set the effect canvas
 */
export function setEffectCanvas(canvas: HTMLCanvasElement | null): void {
  effectCanvas = canvas;
}

/**
 * Animation loop
 */
function startAnimationLoop(): void {
  const loop = (time: number) => {
    if (activeEffects.size === 0 || !effectCanvas) {
      animationFrameId = null;
      return;
    }

    const ctx = effectCanvas.getContext('2d');
    if (!ctx) {
      animationFrameId = requestAnimationFrame(loop);
      return;
    }

    // Clear canvas (or let effects handle it)
    // ctx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);

    // Render each active effect
    for (const [_id, instance] of Array.from(activeEffects.entries())) {
      const delta = time - instance.lastTime;
      instance.lastTime = time;

      // Check if should render
      if (instance.plugin.shouldRender && !instance.plugin.shouldRender(instance.config)) {
        continue;
      }

      // Render
      instance.plugin.render(ctx, instance.config, instance.frame, delta);
      instance.frame++;
    }

    animationFrameId = requestAnimationFrame(loop);
  };

  animationFrameId = requestAnimationFrame(loop);
}

/**
 * Apply effects from a theme configuration
 */
export function applyThemeEffects(theme: ResolvedThemeConfig, canvas: HTMLCanvasElement): void {
  // Stop existing effects
  stopAllEffects();

  // Apply radar effect if enabled
  if (theme.animations.radar?.enabled) {
    const radarPlugin = plugins.get('radar-sweep');
    if (radarPlugin) {
      startEffect('radar-sweep', theme.animations.radar, canvas);
    }
  }
}
