/**
 * Classic Theme Configuration
 *
 * Traditional warm wood tones.
 * Clean, elegant aesthetic inspired by classic chess boards.
 */

import type { ThemeConfig } from '../../types.js';
import { Role } from '@cotulenh/common';

const ASSET_BASE = '/themes/classic';

export const classicTheme: ThemeConfig = {
  meta: {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional warm wood tones',
    version: '2.0.0',
    author: 'CoTuLenh'
  },

  colors: {
    primary: {
      base: '#b58863',
      dim: 'rgba(181, 136, 99, 0.3)',
      glow: 'rgba(181, 136, 99, 0.5)'
    },
    secondary: {
      base: '#769656',
      dim: 'rgba(118, 150, 86, 0.3)',
      glow: 'rgba(118, 150, 86, 0.5)'
    },
    accent: {
      base: '#f0d9b5',
      dim: 'rgba(240, 217, 181, 0.3)',
      glow: 'rgba(240, 217, 181, 0.5)'
    },
    semantic: {
      warning: '#e6a23c',
      error: '#d32f2f',
      success: '#67c23a',
      info: '#5d9bce'
    },
    board: {
      background: '#f0d9b5',
      border: 'rgba(181, 136, 99, 0.5)',
      shadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      light: '#f0d9b5',
      dark: '#b58863',
      highlight: 'rgba(255, 255, 0, 0.4)',
      selected: 'rgba(20, 85, 30, 0.5)',
      selectedBorder: '#14551e',
      lastMoveFrom: 'rgba(155, 199, 0, 0.41)',
      lastMoveTo: 'rgba(155, 199, 0, 0.41)',
      moveDest: '#829769',
      capture: '#c75450',
      check: 'rgba(255, 0, 0, 0.5)',
      deployOrigin: 'rgba(255, 215, 0, 0.35)',
      deployOriginBorder: 'gold',
      deployDest: 'rgba(0, 200, 100, 0.25)',
      deployDestBorder: '#00c864',
      airFriendly: 'rgba(23, 82, 190, 0.8)',
      airOpponent: 'rgba(255, 165, 0, 0.9)',
      airOverlap: 'rgba(190, 23, 23, 0.8)'
    },
    pieces: {
      shadow: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3))',
      blueFilter: 'drop-shadow(0 2px 4px rgba(93, 155, 206, 0.4))',
      redFilter: 'drop-shadow(0 2px 4px rgba(199, 84, 80, 0.4))',
      heroicFilter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6)) brightness(1.1)',
      hoverFilter: 'brightness(1.1) drop-shadow(0 6px 8px rgba(0, 0, 0, 0.3))',
      dragFilter: 'brightness(1.1) drop-shadow(0 10px 12px rgba(0, 0, 0, 0.4))'
    }
  },

  assets: {
    board: {
      background: `${ASSET_BASE}/board-wood.svg`
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
      pattern: `${ASSET_BASE}/paper-texture.svg`
    }
  },

  effects: {
    moveIndicators: {
      type: 'ring',
      color: 'rgba(20, 85, 30, 0.5)',
      size: 40,
      opacity: 0.6,
      glow: false
    },
    selection: {
      type: 'border',
      color: 'rgba(20, 85, 30, 0.5)',
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
        border: 'gold',
        pulse: true,
        pulseSpeed: 2
      },
      dest: {
        fill: 'rgba(0, 200, 100, 0.25)',
        border: '#00c864',
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
        color: 'rgba(155, 199, 0, 0.41)',
        borderRadius: 10
      },
      to: {
        type: 'fill',
        color: 'rgba(155, 199, 0, 0.41)',
        borderRadius: 10
      }
    }
  },

  filters: {
    pieceBlue: 'drop-shadow(0 2px 4px rgba(93, 155, 206, 0.4))',
    pieceRed: 'drop-shadow(0 2px 4px rgba(199, 84, 80, 0.4))',
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
      duration: 150,
      easing: 'ease-out'
    }
  },

  ui: {
    background: {
      type: 'image',
      value: 'url(/themes/classic/background.jpg)',
      overlay: {
        scanlines: false,
        vignette: true,
        opacity: 0.1,
        color: 'rgba(0, 0, 0, 0.4)'
      }
    },
    panel: {
      background: 'rgba(48, 46, 43, 0.95)',
      border: 'rgba(181, 136, 99, 0.4)',
      borderRadius: '8px',
      backdropBlur: 8
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
    sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
    md: '0 4px 6px rgba(0, 0, 0, 0.15)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.2)'
  },

  transitions: {
    fast: '0.1s ease',
    base: '0.15s ease',
    slow: '0.25s ease'
  }
};
