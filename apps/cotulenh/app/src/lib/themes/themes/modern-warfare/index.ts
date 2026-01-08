/**
 * Modern Warfare Theme Configuration
 *
 * Tactical HUD aesthetic with cyan/amber accents.
 * High-contrast military interface style.
 */

import type { ThemeConfig } from '../../types.js';
import { Role } from '@cotulenh/common';

// Base asset paths - will be updated after SVG extraction
const ASSET_BASE = '/themes/modern-warfare';

export const modernWarfareTheme: ThemeConfig = {
  meta: {
    id: 'modern-warfare',
    name: 'Modern Warfare',
    description: 'Tactical HUD with cyan/amber accents',
    version: '2.0.0',
    author: 'CoTuLenh'
  },

  colors: {
    primary: {
      base: '#00f3ff',
      dim: 'rgba(0, 243, 255, 0.15)',
      glow: 'rgba(0, 243, 255, 0.5)'
    },
    secondary: {
      base: '#00ff41',
      dim: 'rgba(0, 255, 65, 0.15)',
      glow: 'rgba(0, 255, 65, 0.5)'
    },
    accent: {
      base: '#ffab00',
      dim: 'rgba(255, 171, 0, 0.15)',
      glow: 'rgba(255, 171, 0, 0.5)'
    },
    semantic: {
      warning: '#ffd700',
      error: '#ef4444',
      success: '#22c55e',
      info: '#00f3ff'
    },
    board: {
      background: '#1e293b',
      border: 'rgba(0, 243, 255, 0.15)',
      shadow: 'inset 0 0 100px rgba(0, 0, 0, 0.9)',
      light: '#1e293b',
      dark: '#0f172a',
      highlight: 'rgba(0, 243, 255, 0.2)',
      selected: 'rgba(0, 255, 65, 0.15)',
      selectedBorder: '#00ff41',
      lastMoveFrom: 'rgba(0, 243, 255, 0.1)',
      lastMoveTo: 'rgba(0, 243, 255, 0.15)',
      moveDest: '#00f3ff',
      capture: '#ffab00',
      check: 'rgba(255, 171, 0, 0.6)',
      deployOrigin: 'rgba(255, 174, 0, 0.1)',
      deployOriginBorder: '#ffd700',
      deployDest: 'rgba(0, 255, 65, 0.1)',
      deployDestBorder: '#00ff41',
      airFriendly: '#00f3ff',
      airOpponent: '#ffab00',
      airOverlap: '#ff3333'
    },
    pieces: {
      shadow: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))',
      blueFilter: 'drop-shadow(0 0 4px #00aaff) brightness(1.2) contrast(1.2)',
      redFilter: 'drop-shadow(0 0 4px #ffab00) hue-rotate(45deg) brightness(1.2) contrast(1.1)',
      heroicFilter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.6)) brightness(1.2) contrast(1.1)',
      hoverFilter: 'brightness(1.3) drop-shadow(0 10px 10px rgba(0, 0, 0, 0.5))',
      dragFilter: 'brightness(1.3) drop-shadow(0 15px 15px rgba(0, 0, 0, 0.6))'
    }
  },

  assets: {
    board: {
      background: `${ASSET_BASE}/board-grid.svg`
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
      image: `${ASSET_BASE}/background.jpg`
    }
  },

  effects: {
    moveIndicators: {
      type: 'dot',
      color: 'rgba(20, 85, 30, 0.5)',
      size: 40,
      opacity: 0.8,
      glow: false
    },
    selection: {
      type: 'fill',
      color: 'rgba(0, 255, 65, 0.15)',
      borderWidth: 2,
      borderRadius: 10,
      glow: false
    },
    airDefense: {
      type: 'cross',
      friendlyColor: 'rgba(23, 82, 190, 0.8)',
      opponentColor: 'rgba(255, 165, 0, 0.9)',
      overlapColor: 'rgba(190, 23, 23, 0.8)',
      size: 16,
      opacity: 0.7,
      overlapOpacityMultiplier: 1.3
    },
    deploy: {
      origin: {
        fill: 'rgba(255, 215, 0, 0.35)',
        border: '#ffd700',
        pulse: true,
        pulseSpeed: 2
      },
      dest: {
        fill: 'rgba(0, 200, 100, 0.25)',
        border: '#00ff41',
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
        color: 'rgba(0, 206, 143, 0.49)',
        borderRadius: 10
      },
      to: {
        type: 'fill',
        color: 'rgba(206, 49, 112, 0.5)',
        borderRadius: 10
      }
    }
  },

  filters: {
    pieceBlue: 'drop-shadow(0 0 4px #00aaff) brightness(1.2) contrast(1.2)',
    pieceRed: 'drop-shadow(0 0 4px #ffab00) hue-rotate(45deg) brightness(1.2) contrast(1.1)',
    board:
      'invert(100%) hue-rotate(190deg) brightness(0.65) contrast(1.1) sepia(40%) saturate(150%)'
  },

  animations: {
    pieceMove: {
      enabled: true,
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 0.6, 1)'
    },
    pieceCapture: {
      enabled: true,
      duration: 150,
      easing: 'ease-out'
    },
    radar: {
      enabled: true,
      type: 'sweep',
      color: 'rgba(0, 243, 255, 0.3)',
      speed: 4,
      opacity: 0.3
    }
  },

  ui: {
    background: {
      type: 'gradient',
      value: 'radial-gradient(circle at top center, #0f172a 0%, #050a14 40%)',
      overlay: {
        scanlines: true,
        vignette: true,
        opacity: 0.15,
        color: 'rgba(0, 0, 0, 0.7)'
      },
      colors: {
        base: '#0f172a',
        dark: '#050a14'
      }
    },
    panel: {
      background: 'rgba(15, 23, 42, 0.85)',
      border: 'rgba(0, 243, 255, 0.3)',
      borderRadius: '8px',
      backdropBlur: 16
    },
    typography: {
      fontFamily: "'Share Tech Mono', monospace",
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
    sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)'
  },

  transitions: {
    fast: '0.15s ease',
    base: '0.2s ease',
    slow: '0.3s ease'
  }
};
