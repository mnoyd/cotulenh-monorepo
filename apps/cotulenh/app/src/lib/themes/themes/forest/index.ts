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
      base: '#10b981', // Emerald 500
      dim: 'rgba(16, 185, 129, 0.2)',
      glow: 'rgba(16, 185, 129, 0.5)'
    },
    secondary: {
      base: '#34d399', // Emerald 400
      dim: 'rgba(52, 211, 153, 0.2)',
      glow: 'rgba(52, 211, 153, 0.5)'
    },
    accent: {
      base: '#facc15', // Yellow 400
      dim: 'rgba(250, 204, 21, 0.2)',
      glow: 'rgba(250, 204, 21, 0.5)'
    },
    semantic: {
      warning: '#f59e0b',
      error: '#ef4444',
      success: '#10b981',
      info: '#0ea5e9' // Sky 500 for rain/water elements
    },
    text: {
      primary: '#ecfdf5',
      secondary: '#a7f3d0',
      muted: 'rgba(167, 243, 208, 0.6)',
      inverse: '#022c22'
    },
    board: {
      background: '#022c22', // Emerald 950 (Deep wet forest floor)
      border: 'rgba(16, 185, 129, 0.15)',
      shadow: 'inset 0 0 100px rgba(0, 0, 0, 0.8)',
      light: '#064e3b', // Emerald 900
      dark: '#022c22', // Emerald 950
      highlight: 'rgba(52, 211, 153, 0.2)',
      selected: 'rgba(16, 185, 129, 0.25)',
      selectedBorder: '#10b981',
      lastMoveFrom: 'rgba(16, 185, 129, 0.15)',
      lastMoveTo: 'rgba(16, 185, 129, 0.25)',
      moveDest: '#34d399',
      capture: '#facc15',
      check: 'rgba(239, 68, 68, 0.5)',
      deployOrigin: 'rgba(250, 204, 21, 0.15)',
      deployOriginBorder: '#facc15',
      deployDest: 'rgba(52, 211, 153, 0.15)',
      deployDestBorder: '#34d399',
      airFriendly: '#10b981',
      airOpponent: '#facc15',
      airOverlap: '#ef4444'
    },
    pieces: {
      shadow: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))',
      blueFilter: 'drop-shadow(0 0 5px rgba(14, 165, 233, 0.5)) brightness(1.2) contrast(1.1)', // rain-like glow
      redFilter: 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.5)) brightness(1.15) contrast(1.1)',
      heroicFilter: 'drop-shadow(0 0 12px rgba(250, 204, 21, 0.7)) brightness(1.25)',
      hoverFilter: 'brightness(1.25) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6))',
      dragFilter: 'brightness(1.3) drop-shadow(0 14px 18px rgba(0, 0, 0, 0.7))'
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
      color: 'rgba(52, 211, 153, 0.6)',
      size: 40,
      opacity: 0.7,
      glow: true,
      glowColor: 'rgba(52, 211, 153, 0.3)',
      glowSize: 8
    },
    selection: {
      type: 'glow',
      color: 'rgba(52, 211, 153, 0.25)',
      borderWidth: 2,
      borderRadius: 10,
      glow: true,
      glowColor: 'rgba(52, 211, 153, 0.4)'
    },
    airDefense: {
      type: 'circle',
      friendlyColor: '#10b981',
      opponentColor: '#facc15',
      overlapColor: '#ef4444',
      size: 16,
      opacity: 0.6,
      overlapOpacityMultiplier: 1.5
    },
    deploy: {
      origin: {
        fill: 'rgba(250, 204, 21, 0.15)',
        border: '#facc15',
        pulse: true,
        pulseSpeed: 2.5
      },
      dest: {
        fill: 'rgba(52, 211, 153, 0.15)',
        border: '#34d399',
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
        color: 'rgba(16, 185, 129, 0.2)',
        borderRadius: 10
      },
      to: {
        type: 'glow',
        color: 'rgba(16, 185, 129, 0.3)',
        borderRadius: 10
      }
    }
  },

  filters: {
    pieceBlue: 'drop-shadow(0 0 5px rgba(14, 165, 233, 0.5)) brightness(1.2) contrast(1.1)',
    pieceRed: 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.5)) brightness(1.15) contrast(1.1)',
    // Deep contrast, slight cool shift, somewhat desaturated to feel "gritty" and wet
    board: 'contrast(1.2) brightness(0.9) hue-rotate(-10deg) saturate(1.1)'
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
        opacity: 0.1,
        // Dark blue-ish tint simulating rain/night atmosphere
        color: 'rgba(2, 6, 23, 0.7)'
      },
      colors: {
        base: '#022c22', // Emerald 950
        dark: '#064e3b' // Emerald 900
      }
    },
    panel: {
      // Dark emerald glass
      background: 'rgba(6, 78, 59, 0.85)',
      border: 'rgba(16, 185, 129, 0.3)',
      borderRadius: '8px',
      backdropBlur: 16
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
    sm: '0 2px 4px rgba(0, 0, 0, 0.5)',
    md: '0 6px 12px rgba(0, 0, 0, 0.5)',
    lg: '0 15px 30px rgba(0, 0, 0, 0.5)'
  },

  transitions: {
    fast: '0.15s ease',
    base: '0.2s ease',
    slow: '0.3s ease'
  }
};
