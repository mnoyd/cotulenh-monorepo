/**
 * Forest Theme Configuration
 *
 * Natural green military aesthetic.
 * Camouflage-inspired with earthy tones.
 */

import type { ThemeConfig } from '../../types.js';
import { Role } from '@cotulenh/common';

const ASSET_BASE = '/themes/forest';

export const forestTheme: ThemeConfig = {
  meta: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green military aesthetic',
    version: '2.0.0',
    author: 'CoTuLenh'
  },

  colors: {
    primary: {
      base: '#4ade80',
      dim: 'rgba(74, 222, 128, 0.2)',
      glow: 'rgba(74, 222, 128, 0.5)'
    },
    secondary: {
      base: '#86efac',
      dim: 'rgba(134, 239, 172, 0.2)',
      glow: 'rgba(134, 239, 172, 0.5)'
    },
    accent: {
      base: '#fbbf24',
      dim: 'rgba(251, 191, 36, 0.2)',
      glow: 'rgba(251, 191, 36, 0.5)'
    },
    semantic: {
      warning: '#f59e0b',
      error: '#dc2626',
      success: '#16a34a',
      info: '#60a5fa'
    },
    board: {
      background: '#2d5a27',
      border: 'rgba(74, 222, 128, 0.25)',
      shadow: 'inset 0 0 80px rgba(0, 0, 0, 0.6)',
      light: '#2d5a27',
      dark: '#1a3d16',
      highlight: 'rgba(74, 222, 128, 0.25)',
      selected: 'rgba(134, 239, 172, 0.25)',
      selectedBorder: '#86efac',
      lastMoveFrom: 'rgba(74, 222, 128, 0.15)',
      lastMoveTo: 'rgba(74, 222, 128, 0.25)',
      moveDest: '#4ade80',
      capture: '#fbbf24',
      check: 'rgba(251, 191, 36, 0.6)',
      deployOrigin: 'rgba(251, 191, 36, 0.15)',
      deployOriginBorder: '#fbbf24',
      deployDest: 'rgba(134, 239, 172, 0.15)',
      deployDestBorder: '#86efac',
      airFriendly: '#4ade80',
      airOpponent: '#fbbf24',
      airOverlap: '#ef4444'
    },
    pieces: {
      shadow: 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.6))',
      blueFilter: 'drop-shadow(0 0 5px rgba(96, 165, 250, 0.5)) brightness(1.15)',
      redFilter: 'drop-shadow(0 0 5px rgba(248, 113, 113, 0.5)) brightness(1.15)',
      heroicFilter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.7)) brightness(1.2)',
      hoverFilter: 'brightness(1.2) drop-shadow(0 8px 10px rgba(0, 0, 0, 0.4))',
      dragFilter: 'brightness(1.25) drop-shadow(0 12px 14px rgba(0, 0, 0, 0.5))'
    }
  },

  assets: {
    board: {
      background: `${ASSET_BASE}/board-camo.svg`
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
    },
    background: {
      image: `${ASSET_BASE}/background.jpg`,
      pattern: `${ASSET_BASE}/camo-pattern.svg`
    }
  },

  effects: {
    moveIndicators: {
      type: 'dot',
      color: 'rgba(74, 222, 128, 0.5)',
      size: 40,
      opacity: 0.7,
      glow: true,
      glowColor: 'rgba(74, 222, 128, 0.3)',
      glowSize: 8
    },
    selection: {
      type: 'glow',
      color: 'rgba(134, 239, 172, 0.25)',
      borderWidth: 2,
      borderRadius: 10,
      glow: true,
      glowColor: 'rgba(134, 239, 172, 0.4)'
    },
    airDefense: {
      type: 'circle',
      friendlyColor: '#4ade80',
      opponentColor: '#fbbf24',
      overlapColor: '#ef4444',
      size: 16,
      opacity: 0.6,
      overlapOpacityMultiplier: 1.5
    },
    deploy: {
      origin: {
        fill: 'rgba(251, 191, 36, 0.15)',
        border: '#fbbf24',
        pulse: true,
        pulseSpeed: 2.5
      },
      dest: {
        fill: 'rgba(134, 239, 172, 0.15)',
        border: '#86efac',
        pulse: false
      },
      incomplete: {
        pulse: true,
        pulseSpeed: 2
      }
    },
    lastMove: {
      from: {
        type: 'glow',
        color: 'rgba(74, 222, 128, 0.15)',
        borderRadius: 10
      },
      to: {
        type: 'glow',
        color: 'rgba(74, 222, 128, 0.25)',
        borderRadius: 10
      }
    }
  },

  filters: {
    pieceBlue: 'drop-shadow(0 0 5px rgba(96, 165, 250, 0.5)) brightness(1.15)',
    pieceRed: 'drop-shadow(0 0 5px rgba(248, 113, 113, 0.5)) brightness(1.15)',
    board: 'sepia(20%) saturate(120%) hue-rotate(60deg) brightness(0.9)'
  },

  animations: {
    pieceMove: {
      enabled: true,
      duration: 180,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    pieceCapture: {
      enabled: true,
      duration: 120,
      easing: 'ease-in-out'
    }
  },

  ui: {
    background: {
      type: 'image',
      value: 'url(/themes/forest/background.jpg)',
      overlay: {
        scanlines: true,
        vignette: true,
        opacity: 0.08,
        color: 'rgba(0, 20, 0, 0.6)'
      }
    },
    panel: {
      background: 'rgba(20, 40, 20, 0.9)',
      border: 'rgba(74, 222, 128, 0.35)',
      borderRadius: '8px',
      backdropBlur: 12
    },
    typography: {
      fontFamily: "'Be Vietnam Pro', sans-serif",
      monoFontFamily: "'Share Tech Mono', monospace",
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
    sm: '0 1px 3px rgba(0, 0, 0, 0.4)',
    md: '0 4px 8px rgba(0, 0, 0, 0.35)',
    lg: '0 10px 20px rgba(0, 0, 0, 0.4)'
  },

  transitions: {
    fast: '0.15s ease',
    base: '0.2s ease',
    slow: '0.3s ease'
  }
};
