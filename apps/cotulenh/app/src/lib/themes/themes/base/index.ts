/**
 * Base Theme Configuration
 *
 * Foundation theme that all other themes can extend.
 * Provides sensible defaults for all theme properties.
 */

import type { ThemeConfig } from '../../types.js';
import { Role } from '@cotulenh/common';

const ASSET_BASE = '/themes/base';

/**
 * Base theme with complete default values.
 * Other themes can extend this and only override what they need.
 */
export const baseTheme: ThemeConfig = {
  meta: {
    id: 'base',
    name: 'Base',
    description: 'Foundation theme with default values',
    version: '1.0.0',
    author: 'CoTuLenh'
  },

  colors: {
    primary: {
      base: '#3b82f6',
      dim: 'rgba(59, 130, 246, 0.2)',
      glow: 'rgba(59, 130, 246, 0.5)'
    },
    secondary: {
      base: '#10b981',
      dim: 'rgba(16, 185, 129, 0.2)',
      glow: 'rgba(16, 185, 129, 0.5)'
    },
    accent: {
      base: '#f59e0b',
      dim: 'rgba(245, 158, 11, 0.2)',
      glow: 'rgba(245, 158, 11, 0.5)'
    },
    semantic: {
      warning: '#f59e0b',
      error: '#ef4444',
      success: '#22c55e',
      info: '#3b82f6'
    },
    text: {
      primary: '#f3f4f6',
      secondary: 'rgba(229, 231, 235, 0.7)',
      muted: 'rgba(229, 231, 235, 0.5)',
      inverse: '#111827'
    },
    board: {
      background: '#1f2937',
      border: 'rgba(59, 130, 246, 0.2)',
      shadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      light: '#374151',
      dark: '#1f2937',
      highlight: 'rgba(59, 130, 246, 0.25)',
      selected: 'rgba(16, 185, 129, 0.25)',
      selectedBorder: '#10b981',
      lastMoveFrom: 'rgba(59, 130, 246, 0.15)',
      lastMoveTo: 'rgba(59, 130, 246, 0.25)',
      moveDest: '#3b82f6',
      capture: '#f59e0b',
      check: 'rgba(239, 68, 68, 0.5)',
      deployOrigin: 'rgba(245, 158, 11, 0.2)',
      deployOriginBorder: '#f59e0b',
      deployDest: 'rgba(16, 185, 129, 0.2)',
      deployDestBorder: '#10b981',
      airFriendly: '#3b82f6',
      airOpponent: '#f59e0b',
      airOverlap: '#ef4444'
    },
    pieces: {
      shadow: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
      blueFilter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))',
      redFilter: 'drop-shadow(0 2px 4px rgba(239, 68, 68, 0.4))',
      heroicFilter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.6)) brightness(1.1)',
      hoverFilter: 'brightness(1.15) drop-shadow(0 6px 8px rgba(0, 0, 0, 0.3))',
      dragFilter: 'brightness(1.15) drop-shadow(0 10px 12px rgba(0, 0, 0, 0.4))'
    }
  },

  assets: {
    board: {
      background: `${ASSET_BASE}/board.svg`
    },
    pieces: {
      blue: {
        [Role.Infantry]: `${ASSET_BASE}/pieces/blue/infantry.svg`,
        [Role.Tank]: `${ASSET_BASE}/pieces/blue/tank.svg`,
        [Role.Artillery]: `${ASSET_BASE}/pieces/blue/artillery.svg`,
        [Role.AirForce]: `${ASSET_BASE}/pieces/blue/air-force.svg`,
        [Role.Navy]: `${ASSET_BASE}/pieces/blue/navy.svg`,
        [Role.Missile]: `${ASSET_BASE}/pieces/blue/missile.svg`,
        [Role.AntiAir]: `${ASSET_BASE}/pieces/blue/anti-air.svg`,
        [Role.Engineer]: `${ASSET_BASE}/pieces/blue/engineer.svg`,
        [Role.Commander]: `${ASSET_BASE}/pieces/blue/commander.svg`,
        [Role.Headquarter]: `${ASSET_BASE}/pieces/blue/headquarter.svg`,
        [Role.Militia]: `${ASSET_BASE}/pieces/blue/militia.svg`
      },
      red: {
        [Role.Infantry]: `${ASSET_BASE}/pieces/red/infantry.svg`,
        [Role.Tank]: `${ASSET_BASE}/pieces/red/tank.svg`,
        [Role.Artillery]: `${ASSET_BASE}/pieces/red/artillery.svg`,
        [Role.AirForce]: `${ASSET_BASE}/pieces/red/air-force.svg`,
        [Role.Navy]: `${ASSET_BASE}/pieces/red/navy.svg`,
        [Role.Missile]: `${ASSET_BASE}/pieces/red/missile.svg`,
        [Role.AntiAir]: `${ASSET_BASE}/pieces/red/anti-air.svg`,
        [Role.Engineer]: `${ASSET_BASE}/pieces/red/engineer.svg`,
        [Role.Commander]: `${ASSET_BASE}/pieces/red/commander.svg`,
        [Role.Headquarter]: `${ASSET_BASE}/pieces/red/headquarter.svg`,
        [Role.Militia]: `${ASSET_BASE}/pieces/red/militia.svg`
      },
      heroic: `${ASSET_BASE}/pieces/heroic-star.svg`
    }
  },

  effects: {
    moveIndicators: {
      type: 'dot',
      color: 'rgba(59, 130, 246, 0.5)',
      size: 35,
      opacity: 0.7,
      glow: false
    },
    selection: {
      type: 'fill',
      color: 'rgba(16, 185, 129, 0.25)',
      borderWidth: 2,
      borderRadius: 8,
      glow: false
    },
    airDefense: {
      type: 'cross',
      friendlyColor: 'rgba(59, 130, 246, 0.7)',
      opponentColor: 'rgba(245, 158, 11, 0.7)',
      overlapColor: 'rgba(239, 68, 68, 0.7)',
      size: 16,
      opacity: 0.7,
      overlapOpacityMultiplier: 1.3
    },
    deploy: {
      origin: {
        fill: 'rgba(245, 158, 11, 0.2)',
        border: '#f59e0b',
        pulse: true,
        pulseSpeed: 2
      },
      dest: {
        fill: 'rgba(16, 185, 129, 0.2)',
        border: '#10b981',
        pulse: false
      },
      incomplete: {
        pulse: true,
        pulseSpeed: 1.5
      }
    },
    lastMove: {
      from: {
        type: 'fill',
        color: 'rgba(59, 130, 246, 0.15)',
        borderRadius: 8
      },
      to: {
        type: 'fill',
        color: 'rgba(59, 130, 246, 0.25)',
        borderRadius: 8
      }
    }
  },

  filters: {
    pieceBlue: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))',
    pieceRed: 'drop-shadow(0 2px 4px rgba(239, 68, 68, 0.4))',
    board: 'none'
  },

  animations: {
    pieceMove: {
      enabled: true,
      duration: 150,
      easing: 'ease-out'
    },
    pieceCapture: {
      enabled: true,
      duration: 120,
      easing: 'ease-out'
    }
  },

  ui: {
    background: {
      type: 'gradient',
      value: 'linear-gradient(to bottom, #111827 0%, #1f2937 100%)',
      overlay: {
        scanlines: false,
        vignette: false,
        opacity: 0,
        color: 'transparent'
      }
    },
    panel: {
      background: 'rgba(31, 41, 55, 0.95)',
      border: 'rgba(59, 130, 246, 0.3)',
      borderRadius: '8px',
      backdropBlur: 12
    },
    typography: {
      fontFamily: "'Inter', 'Be Vietnam Pro', sans-serif",
      monoFontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        md: '1rem',
        lg: '1.125rem',
        xl: '1.25rem'
      }
    }
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.25)',
    md: '0 4px 6px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.25)'
  },

  transitions: {
    fast: '0.1s ease',
    base: '0.15s ease',
    slow: '0.25s ease'
  }
};

export default baseTheme;
