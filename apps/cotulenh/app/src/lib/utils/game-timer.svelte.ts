import { browser } from '$app/environment';
import type { Color } from '@cotulenh/core';

export interface TimeControlConfig {
  initialTimeMs: number;
  incrementMs: number;
}

export interface GameTimerState {
  redTimeMs: number;
  blueTimeMs: number;
  activeColor: Color | null;
  isRunning: boolean;
}

export class GameTimer {
  #redTimeMs = $state(0);
  #blueTimeMs = $state(0);
  #activeColor = $state<Color | null>(null);
  #isRunning = $state(false);
  #intervalId: ReturnType<typeof setInterval> | null = null;
  #lastTickTime = 0;
  #incrementMs: number;

  constructor(config: TimeControlConfig) {
    this.#redTimeMs = config.initialTimeMs;
    this.#blueTimeMs = config.initialTimeMs;
    this.#incrementMs = config.incrementMs;
  }

  get redTimeMs(): number {
    return this.#redTimeMs;
  }

  get blueTimeMs(): number {
    return this.#blueTimeMs;
  }

  get activeColor(): Color | null {
    return this.#activeColor;
  }

  get isRunning(): boolean {
    return this.#isRunning;
  }

  get redTimeFormatted(): string {
    return formatTime(this.#redTimeMs);
  }

  get blueTimeFormatted(): string {
    return formatTime(this.#blueTimeMs);
  }

  get state(): GameTimerState {
    return {
      redTimeMs: this.#redTimeMs,
      blueTimeMs: this.#blueTimeMs,
      activeColor: this.#activeColor,
      isRunning: this.#isRunning
    };
  }

  start(color: Color): void {
    if (!browser) return;

    this.#activeColor = color;
    this.#isRunning = true;
    this.#lastTickTime = performance.now();

    this.#intervalId = setInterval(() => {
      const now = performance.now();
      const elapsed = now - this.#lastTickTime;
      this.#lastTickTime = now;

      if (this.#activeColor === 'r') {
        this.#redTimeMs = Math.max(0, this.#redTimeMs - elapsed);
        if (this.#redTimeMs === 0) {
          this.stop();
        }
      } else if (this.#activeColor === 'b') {
        this.#blueTimeMs = Math.max(0, this.#blueTimeMs - elapsed);
        if (this.#blueTimeMs === 0) {
          this.stop();
        }
      }
    }, 100);
  }

  switchTurn(newColor: Color): void {
    if (!this.#isRunning) return;

    if (this.#activeColor === 'r') {
      this.#redTimeMs += this.#incrementMs;
    } else if (this.#activeColor === 'b') {
      this.#blueTimeMs += this.#incrementMs;
    }

    this.#activeColor = newColor;
    this.#lastTickTime = performance.now();
  }

  pause(): void {
    this.#isRunning = false;
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  }

  resume(): void {
    if (this.#activeColor) {
      this.start(this.#activeColor);
    }
  }

  stop(): void {
    this.pause();
    this.#activeColor = null;
  }

  reset(config: TimeControlConfig): void {
    this.stop();
    this.#redTimeMs = config.initialTimeMs;
    this.#blueTimeMs = config.initialTimeMs;
    this.#incrementMs = config.incrementMs;
  }

  isTimeOut(color: Color): boolean {
    if (color === 'r') return this.#redTimeMs === 0;
    return this.#blueTimeMs === 0;
  }

  getTimeForColor(color: Color): number {
    return color === 'r' ? this.#redTimeMs : this.#blueTimeMs;
  }

  getClockTagValue(color: Color): string {
    const timeMs = this.getTimeForColor(color);
    return formatClockTag(timeMs);
  }
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatClockTag(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function parseTimeControl(str: string): TimeControlConfig | null {
  const match = str.match(/^(\d+)\+(\d+)$/);
  if (!match) return null;

  const minutes = parseInt(match[1], 10);
  const increment = parseInt(match[2], 10);

  return {
    initialTimeMs: minutes * 60 * 1000,
    incrementMs: increment * 1000
  };
}

export function createGameTimer(config: TimeControlConfig): GameTimer {
  return new GameTimer(config);
}

export const TIME_CONTROL_PRESETS: { label: string; config: TimeControlConfig }[] = [
  { label: 'Bullet 1+0', config: { initialTimeMs: 60000, incrementMs: 0 } },
  { label: 'Bullet 2+1', config: { initialTimeMs: 120000, incrementMs: 1000 } },
  { label: 'Blitz 3+0', config: { initialTimeMs: 180000, incrementMs: 0 } },
  { label: 'Blitz 3+2', config: { initialTimeMs: 180000, incrementMs: 2000 } },
  { label: 'Blitz 5+0', config: { initialTimeMs: 300000, incrementMs: 0 } },
  { label: 'Blitz 5+3', config: { initialTimeMs: 300000, incrementMs: 3000 } },
  { label: 'Rapid 10+0', config: { initialTimeMs: 600000, incrementMs: 0 } },
  { label: 'Rapid 10+5', config: { initialTimeMs: 600000, incrementMs: 5000 } },
  { label: 'Rapid 15+10', config: { initialTimeMs: 900000, incrementMs: 10000 } },
  { label: 'Classical 30+0', config: { initialTimeMs: 1800000, incrementMs: 0 } }
];
