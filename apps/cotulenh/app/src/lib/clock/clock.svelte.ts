export type ClockColor = 'r' | 'b';

export interface TimeControl {
  initialTime: number; // in milliseconds
  increment: number; // in milliseconds (Fischer increment)
}

export interface ClockConfig {
  red: TimeControl;
  blue: TimeControl;
}

export type ClockStatus = 'idle' | 'running' | 'paused' | 'timeout';

/**
 * ChessClockState - Reactive clock state management using Svelte 5 runes.
 *
 * Adapted from en-croissant's ClockState pattern:
 * - Tracks time for both players
 * - Handles increment after moves
 * - Emits timeout when time runs out
 */
export class ChessClockState {
  #config = $state<ClockConfig | null>(null);

  #redTime = $state(0);
  #blueTime = $state(0);
  #redIncrement = $state(0);
  #blueIncrement = $state(0);

  #activeSide = $state<ClockColor | null>(null);
  #status = $state<ClockStatus>('idle');
  #lastTick = $state<number | null>(null);
  #intervalId: ReturnType<typeof setInterval> | null = null;

  #onTimeout: ((loser: ClockColor) => void) | null = null;

  constructor(config?: ClockConfig) {
    if (config) {
      this.configure(config);
    }
  }

  configure(config: ClockConfig): void {
    this.#config = config;
    this.#redTime = config.red.initialTime;
    this.#blueTime = config.blue.initialTime;
    this.#redIncrement = config.red.increment;
    this.#blueIncrement = config.blue.increment;
    this.#status = 'idle';
    this.#activeSide = null;
    this.#lastTick = null;
  }

  get initialRedTime(): number {
    return this.#config?.red.initialTime ?? 0;
  }

  get initialBlueTime(): number {
    return this.#config?.blue.initialTime ?? 0;
  }

  get redTime(): number {
    return this.#redTime;
  }

  get blueTime(): number {
    return this.#blueTime;
  }

  get activeSide(): ClockColor | null {
    return this.#activeSide;
  }

  get status(): ClockStatus {
    return this.#status;
  }

  get isRunning(): boolean {
    return this.#status === 'running';
  }

  set onTimeout(callback: (loser: ClockColor) => void) {
    this.#onTimeout = callback;
  }

  start(startingSide: ClockColor = 'r'): void {
    if (this.#status === 'timeout') return;

    this.#activeSide = startingSide;
    this.#status = 'running';
    this.#lastTick = performance.now();
    this.#startInterval();
  }

  pause(): void {
    if (this.#status !== 'running') return;

    this.#updateTime();
    this.#status = 'paused';
    this.#stopInterval();
  }

  resume(): void {
    if (this.#status !== 'paused') return;

    this.#status = 'running';
    this.#lastTick = performance.now();
    this.#startInterval();
  }

  stop(): void {
    this.#stopInterval();
    this.#status = 'idle';
    this.#activeSide = null;
    this.#lastTick = null;
  }

  switchSide(): void {
    if (this.#status !== 'running' || !this.#activeSide) return;

    this.#updateTime();

    // Add increment to the player who just moved
    if (this.#activeSide === 'r') {
      this.#redTime += this.#redIncrement;
    } else {
      this.#blueTime += this.#blueIncrement;
    }

    // Switch active side
    this.#activeSide = this.#activeSide === 'r' ? 'b' : 'r';
    this.#lastTick = performance.now();
  }

  reset(config?: ClockConfig): void {
    this.#stopInterval();
    const targetConfig = config ?? this.#config;

    if (targetConfig) {
      this.configure(targetConfig);
    } else {
      this.#status = 'idle';
      this.#activeSide = null;
      this.#lastTick = null;
    }
  }

  #startInterval(): void {
    this.#stopInterval();
    // Update every 100ms like en-croissant
    this.#intervalId = setInterval(() => this.#tick(), 100);
  }

  #stopInterval(): void {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  }

  #tick(): void {
    if (this.#status !== 'running') return;
    this.#updateTime();
  }

  #updateTime(): void {
    if (!this.#lastTick || !this.#activeSide) return;

    const now = performance.now();
    const elapsed = now - this.#lastTick;
    this.#lastTick = now;

    if (this.#activeSide === 'r') {
      this.#redTime = Math.max(0, this.#redTime - elapsed);
      if (this.#redTime === 0) {
        this.#handleTimeout('r');
      }
    } else {
      this.#blueTime = Math.max(0, this.#blueTime - elapsed);
      if (this.#blueTime === 0) {
        this.#handleTimeout('b');
      }
    }
  }

  #handleTimeout(loser: ClockColor): void {
    this.#status = 'timeout';
    this.#stopInterval();
    this.#onTimeout?.(loser);
  }

  destroy(): void {
    this.#stopInterval();
  }
}

/**
 * Format milliseconds to clock display string.
 * Shows hours if >= 1 hour, shows tenths of seconds if < 1 minute.
 */
export function formatClockTime(ms: number): string {
  if (ms <= 0) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  if (totalSeconds < 60) {
    return `${seconds}.${tenths}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse time control string (e.g., "5+3" = 5 minutes + 3 second increment)
 */
export function parseTimeControl(timeControl: string): TimeControl {
  const parts = timeControl.split('+');
  const minutes = parseFloat(parts[0]) || 5;
  const incrementSeconds = parseFloat(parts[1]) || 0;

  return {
    initialTime: minutes * 60 * 1000,
    increment: incrementSeconds * 1000
  };
}

/**
 * Common time control presets
 */
export const TIME_PRESETS = {
  bullet1: { initialTime: 60_000, increment: 0 },
  bullet2: { initialTime: 120_000, increment: 1_000 },
  blitz3: { initialTime: 180_000, increment: 0 },
  blitz3_2: { initialTime: 180_000, increment: 2_000 },
  blitz5: { initialTime: 300_000, increment: 0 },
  blitz5_3: { initialTime: 300_000, increment: 3_000 },
  rapid10: { initialTime: 600_000, increment: 0 },
  rapid15_10: { initialTime: 900_000, increment: 10_000 },
  classical30: { initialTime: 1_800_000, increment: 0 }
} as const;

/**
 * Factory function to create a ChessClockState
 */
export function createChessClock(config?: ClockConfig): ChessClockState {
  return new ChessClockState(config);
}
