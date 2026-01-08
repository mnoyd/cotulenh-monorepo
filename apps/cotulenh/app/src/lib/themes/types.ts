/**
 * Theme System Type Definitions
 *
 * Centralized type definitions for the comprehensive theme system.
 * Handles colors, assets, effects, animations, and UI configuration.
 */

import type { Role } from '@cotulenh/common';

/**
 * Color set with base, dim, and glow variants for depth effects
 */
export interface ColorSet {
  base: string;
  dim: string;
  glow: string;
}

/**
 * Semantic colors for UI states
 */
export interface SemanticColors {
  warning: string;
  error: string;
  success: string;
  info: string;
}

/**
 * Board-specific colors
 */
export interface BoardColors {
  background: string;
  border: string;
  shadow: string;

  // Square colors
  light: string;
  dark: string;

  // Interactive states
  highlight: string;
  selected: string;
  selectedBorder: string;

  // Move indicators
  lastMoveFrom: string;
  lastMoveTo: string;
  moveDest: string;
  capture: string;
  check: string;

  // Deploy session
  deployOrigin: string;
  deployOriginBorder: string;
  deployDest: string;
  deployDestBorder: string;

  // Air defense zones
  airFriendly: string;
  airOpponent: string;
  airOverlap: string;
}

/**
 * Piece-specific colors
 */
export interface PieceColors {
  shadow: string;
  blueFilter: string;
  redFilter: string;
  heroicFilter: string;
  hoverFilter: string;
  dragFilter: string;
}

/**
 * Theme color configuration
 */
export interface ThemeColors {
  primary: ColorSet;
  secondary: ColorSet;
  accent: ColorSet;
  semantic: SemanticColors;
  board: BoardColors;
  pieces: PieceColors;
}

/**
 * Asset references - paths to SVG/image files
 */
export interface ThemeAssets {
  board: {
    background: string; // URL to board pattern SVG or image
    overlay?: string; // Optional overlay image
  };
  pieces: {
    blue: Record<Role, string>; // URL to SVG for each piece type
    red: Record<Role, string>;
    heroic?: string; // Star/heroic marker
  };
  background?: {
    image?: string; // Background image for the app
    pattern?: string; // Overlay pattern
  };
}

/**
 * Move indicator effect configuration
 */
export interface MoveEffectConfig {
  type: 'dot' | 'ring' | 'square' | 'cross';
  color: string;
  size: number; // percentage of square
  opacity: number;
  glow?: boolean;
  glowColor?: string;
  glowSize?: number;
}

/**
 * Selection effect configuration
 */
export interface SelectionEffectConfig {
  type: 'border' | 'fill' | 'glow' | 'none';
  color: string;
  borderWidth?: number;
  borderRadius?: number;
  glow?: boolean;
  glowColor?: string;
}

/**
 * Air defense zone effect configuration
 */
export interface AirDefenseEffectConfig {
  type: 'cross' | 'circle' | 'square' | 'diamond';
  friendlyColor: string;
  opponentColor: string;
  overlapColor: string;
  size: number; // pixels
  opacity: number;
  overlapOpacityMultiplier: number;
}

/**
 * Deploy session effect configuration
 */
export interface DeployEffectConfig {
  origin: {
    fill: string;
    border: string;
    pulse: boolean;
    pulseSpeed: number; // seconds
  };
  dest: {
    fill: string;
    border: string;
    pulse: boolean;
  };
  incomplete: {
    pulse: boolean;
    pulseSpeed: number;
  };
}

/**
 * Last move highlight configuration
 */
export interface LastMoveEffectConfig {
  from: {
    type: 'fill' | 'border' | 'glow';
    color: string;
    borderRadius?: number;
  };
  to: {
    type: 'fill' | 'border' | 'glow';
    color: string;
    borderRadius?: number;
  };
}

/**
 * Theme effects configuration
 */
export interface ThemeEffects {
  moveIndicators: MoveEffectConfig;
  selection: SelectionEffectConfig;
  airDefense: AirDefenseEffectConfig;
  deploy: DeployEffectConfig;
  lastMove: LastMoveEffectConfig;
}

/**
 * CSS filter configuration for pieces and board
 */
export interface ThemeFilters {
  pieceBlue?: string;
  pieceRed?: string;
  board?: string;
}

/**
 * Animation timing configuration
 */
export interface AnimationConfig {
  enabled: boolean;
  duration: number; // milliseconds
  easing: string; // CSS easing function
}

/**
 * Radar effect configuration (for tactical themes)
 */
export interface RadarEffectConfig {
  enabled: boolean;
  type: 'sweep' | 'pulse' | 'ripple';
  color: string;
  speed: number; // seconds per cycle
  opacity: number;
}

/**
 * Theme animation settings
 */
export interface ThemeAnimations {
  pieceMove: AnimationConfig;
  pieceCapture: AnimationConfig;
  radar?: RadarEffectConfig;
}

/**
 * Background type
 */
export type BackgroundType = 'gradient' | 'image' | 'solid';

/**
 * Background configuration
 */
export interface BackgroundConfig {
  type: BackgroundType;
  value: string; // CSS gradient or image URL
  overlay?: {
    scanlines: boolean;
    vignette: boolean;
    opacity: number;
    color?: string;
  };
  colors?: {
    base: string;
    dark: string;
  };
}

/**
 * Panel style configuration
 */
export interface PanelStyle {
  background: string;
  border: string;
  borderRadius: string;
  backdropBlur: number; // pixels
}

/**
 * Typography configuration
 */
export interface TypographyStyle {
  fontFamily: string;
  monoFontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

/**
 * UI configuration
 */
export interface ThemeUI {
  background: BackgroundConfig;
  panel: PanelStyle;
  typography: TypographyStyle;
}

/**
 * Shadow presets
 */
export interface ShadowPresets {
  sm: string;
  md: string;
  lg: string;
}

/**
 * Transition timing
 */
export interface TransitionTiming {
  fast: string; // e.g., "0.15s ease"
  base: string;
  slow: string;
}

/**
 * Theme metadata
 */
export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
}

/**
 * Composable theme layers - groups related configuration
 */
export interface ThemeLayers {
  colors: ThemeColors;
  assets: ThemeAssets;
  effects: ThemeEffects;
  filters: ThemeFilters;
  animations: ThemeAnimations;
  ui: ThemeUI;
  shadows: ShadowPresets;
  transitions: TransitionTiming;
}

/**
 * Theme configuration with inheritance support
 *
 * Themes can optionally extend another theme and only override specific layers.
 * Use `layers` for partial overrides, or the flat properties for full definitions.
 */
export interface ThemeConfig {
  meta: ThemeMeta;
  /** Optional: Inherit from another theme */
  extends?: ThemeId;
  /** Partial layer overrides (merged with parent) */
  layers?: Partial<ThemeLayers>;
  // Direct properties (for backwards compatibility and full theme definitions)
  colors?: ThemeColors;
  assets?: ThemeAssets;
  effects?: ThemeEffects;
  filters?: ThemeFilters;
  animations?: ThemeAnimations;
  ui?: ThemeUI;
  shadows?: ShadowPresets;
  transitions?: TransitionTiming;
}

/**
 * Fully resolved theme configuration (after inheritance merge)
 *
 * This represents a theme with all layers fully defined,
 * after any inheritance has been resolved.
 */
export interface ResolvedThemeConfig {
  meta: ThemeMeta;
  colors: ThemeColors;
  assets: ThemeAssets;
  effects: ThemeEffects;
  filters: ThemeFilters;
  animations: ThemeAnimations;
  ui: ThemeUI;
  shadows: ShadowPresets;
  transitions: TransitionTiming;
}

/**
 * Theme ID type
 */
export type ThemeId = 'base' | 'modern-warfare' | 'classic' | 'forest';

/**
 * Theme info for display in UI
 */
export interface ThemeInfo {
  id: ThemeId;
  name: string;
  description: string;
}
