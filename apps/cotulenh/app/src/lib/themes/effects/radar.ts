/**
 * Radar Sweep Effect
 *
 * Classic tactical radar sweep animation for military themes.
 */

import type { EffectPlugin } from './plugin.js';
import type { RadarEffectConfig } from '../types.js';

/**
 * Parse color string to get RGB components
 */
function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  // Handle rgba
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
    };
  }

  // Handle hex
  const hexMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
      a: 1
    };
  }

  // Default to cyan
  return { r: 0, g: 243, b: 255, a: 0.3 };
}

export const radarSweepEffect: EffectPlugin = {
  id: 'radar-sweep',
  name: 'Radar Sweep',
  description: 'Classic rotating radar sweep line with trail',

  shouldRender(config: unknown): boolean {
    const radarConfig = config as RadarEffectConfig;
    return radarConfig.enabled;
  },

  render(ctx: CanvasRenderingContext2D, config: unknown, frame: number, _delta: number): void {
    const radarConfig = config as RadarEffectConfig;
    const { color, speed, opacity } = radarConfig;

    const canvas = ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.max(canvas.width, canvas.height);

    // Calculate angle based on time
    const cycleDuration = speed * 1000; // Convert to ms
    const angle = ((frame * 16.67) / cycleDuration) * Math.PI * 2;

    // Clear previous frame (with fade for trail effect)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Parse color
    const { r, g, b, a } = parseColor(color);
    const baseAlpha = a * opacity;

    // Draw sweep gradient
    const gradient = ctx.createConicGradient(angle, centerX, centerY);

    // Sweep trail (fades out behind the line)
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.8})`);
    gradient.addColorStop(0.1, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.4})`);
    gradient.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.1})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw the bright sweep line
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    const lineGradient = ctx.createLinearGradient(0, 0, radius, 0);
    lineGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseAlpha})`);
    lineGradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.5})`);
    lineGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();

    ctx.restore();
  },

  dispose(): void {
    // No cleanup needed
  }
};

export default radarSweepEffect;
