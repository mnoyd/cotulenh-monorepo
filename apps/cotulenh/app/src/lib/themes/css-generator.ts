/**
 * CSS Generator
 *
 * Generates CSS custom properties from theme configuration.
 * Injects theme-specific styles into the DOM.
 */

import type { ResolvedThemeConfig, ThemeId } from './types.js';
import { getCachedCSS } from './generators/cache.js';

/**
 * Generate CSS custom properties from theme config
 */
export function generateThemeCSS(config: ResolvedThemeConfig): string {
  const { meta, colors, effects, filters, ui, shadows, transitions } = config;

  const cssVars: string[] = [];

  // === Primary Colors ===
  cssVars.push(`  --theme-primary: ${colors.primary.base};`);
  cssVars.push(`  --theme-primary-dim: ${colors.primary.dim};`);
  cssVars.push(`  --theme-primary-glow: ${colors.primary.glow};`);

  // === Secondary Colors ===
  cssVars.push(`  --theme-secondary: ${colors.secondary.base};`);
  cssVars.push(`  --theme-secondary-dim: ${colors.secondary.dim};`);
  cssVars.push(`  --theme-secondary-glow: ${colors.secondary.glow};`);

  // === Accent Colors ===
  cssVars.push(`  --theme-accent: ${colors.accent.base};`);
  cssVars.push(`  --theme-accent-dim: ${colors.accent.dim};`);
  cssVars.push(`  --theme-accent-glow: ${colors.accent.glow};`);

  // === Semantic Colors ===
  cssVars.push(`  --theme-warning: ${colors.semantic.warning};`);
  cssVars.push(`  --theme-error: ${colors.semantic.error};`);
  cssVars.push(`  --theme-success: ${colors.semantic.success};`);
  cssVars.push(`  --theme-info: ${colors.semantic.info};`);

  // === Background Colors ===
  // Note: --theme-bg-dark and --theme-bg-base are defined in static CSS files
  // since ui.background.value may contain gradients/images, not colors
  cssVars.push(`  --theme-bg-panel: ${ui.panel.background};`);
  cssVars.push(`  --theme-bg-elevated: ${ui.panel.background};`);
  cssVars.push(`  --theme-bg-overlay: ${ui.panel.background};`);

  if (ui.background.colors) {
    cssVars.push(`  --theme-bg-base: ${ui.background.colors.base};`);
    cssVars.push(`  --theme-bg-dark: ${ui.background.colors.dark};`);
  }

  // === Border Colors ===
  cssVars.push(`  --theme-border: ${colors.accent.base};`);
  cssVars.push(`  --theme-border-subtle: ${colors.accent.dim};`);
  cssVars.push(`  --theme-border-strong: ${colors.primary.base};`);

  // === Text Colors ===
  cssVars.push(`  --theme-text-primary: ${colors.text.primary};`);
  cssVars.push(`  --theme-text-secondary: ${colors.text.secondary};`);
  cssVars.push(`  --theme-text-muted: ${colors.text.muted};`);
  cssVars.push(`  --theme-text-inverse: ${colors.text.inverse};`);

  // === Navigation Colors ===
  cssVars.push(`  --theme-nav-bg: ${ui.panel.background};`);
  cssVars.push(`  --theme-nav-border: ${colors.accent.dim};`);
  cssVars.push(`  --theme-nav-text: ${colors.secondary.dim};`);
  cssVars.push(`  --theme-nav-text-hover: ${colors.primary.base};`);
  cssVars.push(`  --theme-nav-text-active: ${ui.background.value};`);
  cssVars.push(`  --theme-nav-active-bg: ${colors.primary.base};`);
  cssVars.push(`  --theme-nav-hover-bg: ${colors.primary.dim};`);

  // === Team Colors ===
  cssVars.push(`  --theme-team-blue: ${colors.primary.base};`);
  cssVars.push(`  --theme-team-blue-glow: ${colors.primary.glow};`);
  cssVars.push(`  --theme-team-red: ${colors.accent.base};`);
  cssVars.push(`  --theme-team-red-glow: ${colors.accent.glow};`);

  // === Board Colors ===
  cssVars.push(`  --theme-board-bg: ${colors.board.background};`);
  cssVars.push(`  --theme-board-border: ${colors.board.border};`);
  cssVars.push(`  --theme-board-shadow: ${colors.board.shadow};`);
  cssVars.push(`  --theme-board-filter: ${filters.board || 'none'};`);

  // Board square colors
  cssVars.push(`  --theme-board-light: ${colors.board.light};`);
  cssVars.push(`  --theme-board-dark: ${colors.board.dark};`);
  cssVars.push(`  --theme-board-highlight: ${colors.board.highlight};`);
  cssVars.push(`  --theme-board-selected: ${colors.board.selected};`);
  cssVars.push(`  --theme-board-selected-border: ${colors.board.selectedBorder};`);

  // Move indicator colors
  cssVars.push(`  --theme-board-last-move-from: ${colors.board.lastMoveFrom};`);
  cssVars.push(`  --theme-board-last-move-to: ${colors.board.lastMoveTo};`);
  cssVars.push(`  --theme-board-move-dest: ${colors.board.moveDest};`);
  cssVars.push(`  --theme-board-capture: ${colors.board.capture};`);
  cssVars.push(`  --theme-board-check: ${colors.board.check};`);

  // Deploy colors
  cssVars.push(`  --theme-board-deploy-origin: ${colors.board.deployOrigin};`);
  cssVars.push(`  --theme-board-deploy-origin-border: ${colors.board.deployOriginBorder};`);
  cssVars.push(`  --theme-board-deploy-dest: ${colors.board.deployDest};`);
  cssVars.push(`  --theme-board-deploy-dest-border: ${colors.board.deployDestBorder};`);

  // Air defense colors
  cssVars.push(`  --theme-board-air-friendly: ${colors.board.airFriendly};`);
  cssVars.push(`  --theme-board-air-opponent: ${colors.board.airOpponent};`);
  cssVars.push(`  --theme-board-air-overlap: ${colors.board.airOverlap};`);

  // === Piece Colors & Filters ===
  cssVars.push(`  --theme-piece-shadow: ${colors.pieces.shadow};`);
  cssVars.push(`  --theme-piece-blue-filter: ${filters.pieceBlue || 'none'};`);
  cssVars.push(`  --theme-piece-red-filter: ${filters.pieceRed || 'none'};`);
  cssVars.push(`  --theme-piece-heroic-filter: ${filters.pieceRed || 'none'};`);
  cssVars.push(`  --theme-piece-hover-filter: ${colors.pieces.hoverFilter};`);
  cssVars.push(`  --theme-piece-drag-filter: ${colors.pieces.dragFilter};`);

  // === Button Colors ===
  cssVars.push(`  --theme-btn-attack-stay: ${colors.secondary.base};`);
  cssVars.push(`  --theme-btn-attack-normal: ${colors.accent.base};`);
  cssVars.push(`  --theme-btn-cancel-bg: ${colors.semantic.error};`);
  cssVars.push(`  --theme-btn-cancel-border: ${colors.accent.base};`);
  cssVars.push(`  --theme-btn-confirm-bg: ${colors.secondary.base};`);
  cssVars.push(`  --theme-btn-confirm-border: ${colors.secondary.base};`);

  // === Heroic Effect ===
  cssVars.push(`  --theme-heroic-bg: ${ui.panel.background};`);
  cssVars.push(`  --theme-heroic-border: ${colors.accent.base};`);
  cssVars.push(`  --theme-heroic-glow: ${colors.accent.glow};`);
  cssVars.push(`  --theme-heroic-star: ${colors.accent.base};`);

  // === Glow Effects ===
  cssVars.push(`  --theme-glow-primary: ${shadows.md};`);
  cssVars.push(`  --theme-glow-secondary: ${colors.secondary.glow};`);
  cssVars.push(`  --theme-glow-accent: ${colors.accent.glow};`);
  cssVars.push(`  --theme-glow-error: ${colors.semantic.error};`);

  // === Shadows ===
  cssVars.push(`  --theme-shadow-sm: ${shadows.sm};`);
  cssVars.push(`  --theme-shadow-md: ${shadows.md};`);
  cssVars.push(`  --theme-shadow-lg: ${shadows.lg};`);

  // === Transitions ===
  cssVars.push(`  --theme-transition-fast: ${transitions.fast};`);
  cssVars.push(`  --theme-transition-base: ${transitions.base};`);
  cssVars.push(`  --theme-transition-slow: ${transitions.slow};`);

  // === Overlay Effects ===
  const scanlineOpacity = ui.background.overlay?.scanlines ? ui.background.overlay.opacity : 0;
  const vignetteOpacity = ui.background.overlay?.vignette ? ui.background.overlay.opacity : 0;
  cssVars.push(`  --theme-scanline-opacity: ${scanlineOpacity};`);
  cssVars.push(`  --theme-vignette-opacity: ${vignetteOpacity};`);
  cssVars.push(
    `  --theme-vignette-color: ${ui.background.overlay?.color || 'rgba(0, 0, 0, 0.7)'};`
  );

  // === Typography ===
  cssVars.push(`  --font-ui: ${ui.typography.fontFamily};`);
  cssVars.push(`  --font-mono: ${ui.typography.monoFontFamily};`);

  // Return wrapped in theme class selector
  return `.theme-${meta.id} {\n${cssVars.join('\n')}\n}`;
}

/**
 * Generate effect-specific CSS for board interactions
 */
export function generateEffectCSS(config: ResolvedThemeConfig): string {
  const { effects, meta } = config;
  const rules: string[] = [];

  const prefix = `.theme-${meta.id}`;

  // === Move Destinations ===
  rules.push(`
${prefix} cg-board square.move-dest::before {
  content: '';
  position: absolute;
  border-radius: ${getBorderRadius(effects.moveIndicators.type)};
  background: ${getMoveIndicatorBg(effects.moveIndicators)};
  width: ${effects.moveIndicators.size}%;
  height: ${effects.moveIndicators.size}%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 3;
  opacity: ${effects.moveIndicators.opacity};
  ${effects.moveIndicators.glow ? `box-shadow: 0 0 ${effects.moveIndicators.glowSize || 10}px ${effects.moveIndicators.glowColor || effects.moveIndicators.color};` : ''}
}`);

  // === Selection ===
  rules.push(`
${prefix} cg-board square.selected {
  ${getSelectionStyle(effects.selection)}
}`);

  // === Air Defense Zones ===
  rules.push(`
${prefix} cg-board square.air-defense-influence::before,
${prefix} cg-board square.air-defense-influence::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${effects.airDefense.size}px;
  height: 2px;
  background-color: currentColor;
  opacity: ${effects.airDefense.opacity};
  z-index: 9;
  pointer-events: none;
}

${prefix} cg-board square.air-defense-influence::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

${prefix} cg-board square.air-defense-influence::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

${prefix} cg-board square.air-defense-influence.friendly::before,
${prefix} cg-board square.air-defense-influence.friendly::after {
  color: ${effects.airDefense.friendlyColor};
}

${prefix} cg-board square.air-defense-influence.opponent::before,
${prefix} cg-board square.air-defense-influence.opponent::after {
  color: ${effects.airDefense.opponentColor};
}

${prefix} cg-board square.air-defense-influence.opponent.overlap::before,
${prefix} cg-board square.air-defense-influence.opponent.overlap::after {
  color: ${effects.airDefense.overlapColor};
  opacity: ${effects.airDefense.opacity * effects.airDefense.overlapOpacityMultiplier};
}`);

  // === Deploy Session ===
  rules.push(`
${prefix} cg-board square.deploy-origin {
  background: ${effects.deploy.origin.fill};
  box-shadow: inset 0 0 0 2px ${effects.deploy.origin.border};
  border-radius: 10px;
  ${effects.deploy.origin.pulse ? `animation: theme-deploy-pulse-${meta.id} ${effects.deploy.origin.pulseSpeed}s ease-in-out infinite;` : ''}
}

${prefix} cg-board square.deploy-dest {
  background: ${effects.deploy.dest.fill};
  box-shadow: inset 0 0 0 1px ${effects.deploy.dest.border};
  border-radius: 10px;
}

${
  effects.deploy.incomplete.pulse
    ? `
@keyframes theme-deploy-pulse-${meta.id} {
  0%, 100% {
    box-shadow: inset 0 0 0 2px ${effects.deploy.origin.border};
  }
  50% {
    box-shadow: inset 0 0 0 3px ${effects.deploy.origin.border}, 0 0 10px ${effects.deploy.origin.border};
  }
}
`
    : ''
}`);

  // === Last Move ===
  rules.push(`
${prefix} cg-board square.last-move.from {
  ${getLastMoveStyle(effects.lastMove.from)}
}

${prefix} cg-board square.last-move.to {
  ${getLastMoveStyle(effects.lastMove.to)}
}`);

  return rules.join('\n');
}

/**
 * Inject theme CSS into the DOM
 */
export function injectThemeCSS(config: ResolvedThemeConfig): void {
  // Remove existing style for this theme if present
  const existingId = `theme-styles-${config.meta.id}`;
  const existing = document.getElementById(existingId);
  if (existing) {
    existing.remove();
  }

  // Create new style element
  const style = document.createElement('style');
  style.id = existingId;
  style.textContent = generateThemeCSS(config) + '\n' + generateEffectCSS(config);
  document.head.appendChild(style);
}

/**
 * Remove all theme CSS from DOM
 */
export function removeAllThemeCSS(): void {
  const styles = document.querySelectorAll('[id^="theme-styles-"]');
  styles.forEach((s) => s.remove());
}

// === Helper Functions ===

function getBorderRadius(type: string): string {
  switch (type) {
    case 'dot':
    case 'ring':
      return '50%';
    case 'square':
    case 'cross':
      return '0';
    default:
      return '10px';
  }
}

function getMoveIndicatorBg(config: { type: string; color: string }): string {
  switch (config.type) {
    case 'dot':
      return `radial-gradient(${config.color} 40%, transparent 0)`;
    case 'ring':
      return `radial-gradient(transparent 40%, ${config.color} 40%, ${config.color} 60%, transparent 60%)`;
    case 'square':
      return config.color;
    case 'cross':
      return `none`; // Handled by ::before/::after pseudo-elements
    default:
      return `radial-gradient(${config.color} 22%, transparent 0)`;
  }
}

function getSelectionStyle(config: {
  type: string;
  color: string;
  borderWidth?: number;
  borderRadius?: number;
  glow?: boolean;
  glowColor?: string;
}): string {
  const borderRadius = config.borderRadius || 10;
  const borderWidth = config.borderWidth || 2;

  switch (config.type) {
    case 'border':
      return `background: transparent; border: ${borderWidth}px solid ${config.color}; border-radius: ${borderRadius}px;`;
    case 'fill':
      return `background: ${config.color}; border-radius: ${borderRadius}px;`;
    case 'glow':
      return `background: ${config.color}; border-radius: ${borderRadius}px}; box-shadow: 0 0 15px ${config.glowColor || config.color};`;
    default:
      return `background: ${config.color}; border-radius: ${borderRadius}px;`;
  }
}

function getLastMoveStyle(config: { type: string; color: string; borderRadius?: number }): string {
  const borderRadius = config.borderRadius || 10;

  switch (config.type) {
    case 'border':
      return `border: 2px solid ${config.color}; border-radius: ${borderRadius}px;`;
    case 'fill':
      return `background-color: ${config.color}; border-radius: ${borderRadius}px;`;
    case 'glow':
      return `box-shadow: 0 0 10px ${config.color}; border-radius: ${borderRadius}px;`;
    default:
      return `background-color: ${config.color}; border-radius: ${borderRadius}px;`;
  }
}
